import type { FirecrawlResult, MapResult, FirecrawlBranding } from "./types";

function getFirecrawlKey(): string {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("Missing FIRECRAWL_API_KEY environment variable");
  return apiKey;
}

async function scrapeWithFirecrawl(url: string, signal?: AbortSignal): Promise<FirecrawlResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links", "screenshot", "branding"],
        onlyMainContent: false,
        timeout: 30000,
      }),
      signal,
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (!json.success) return null;

    return {
      markdown: json.data?.markdown || "",
      metadata: json.data?.metadata || {},
      links: json.data?.links || [],
      screenshot: json.data?.screenshot || undefined,
      branding: json.data?.branding || undefined,
    };
  } catch {
    return null;
  }
}

async function scrapeWithFetch(url: string, signal?: AbortSignal): Promise<FirecrawlResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();

  // Extract metadata with regex (no cheerio)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

  // Extract visible text — strip tags, scripts, styles
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  // Extract links
  const linkMatches = html.matchAll(/<a[^>]+href=["']([^"'#][^"']*)["']/gi);
  const links = [...linkMatches].map((m) => {
    try {
      return new URL(m[1], url).href;
    } catch {
      return m[1];
    }
  }).slice(0, 30);

  return {
    markdown: cleaned,
    metadata: {
      title: titleMatch?.[1]?.trim(),
      description: descMatch?.[1],
      ogTitle: ogTitleMatch?.[1],
      ogDescription: ogDescMatch?.[1],
      ogImage: ogImageMatch?.[1],
    },
    links,
  };
}

export async function scrapeWebsite(url: string, signal?: AbortSignal): Promise<FirecrawlResult> {
  // Try Firecrawl first, fall back to basic fetch
  const firecrawlResult = await scrapeWithFirecrawl(url, signal);
  if (firecrawlResult) return firecrawlResult;

  console.log("Firecrawl unavailable, using fetch fallback");
  return scrapeWithFetch(url, signal);
}

const KNOWN_SECTIONS = [
  "about", "blog", "product", "products", "services", "contact",
  "pricing", "faq", "docs", "documentation", "team", "careers", "press",
  "portfolio", "case-studies", "testimonials", "features",
];

function categorizeSections(links: { url: string }[]): string[] {
  const found = new Set<string>();
  for (const link of links) {
    try {
      const path = new URL(link.url).pathname.toLowerCase();
      for (const section of KNOWN_SECTIONS) {
        if (path.startsWith(`/${section}`)) {
          found.add(section);
        }
      }
    } catch {
      // skip invalid URLs
    }
  }
  return [...found];
}

function computeMaxDepth(links: { url: string }[], baseUrl: string): number {
  let max = 0;
  let basePathSegments = 0;
  try {
    basePathSegments = new URL(baseUrl).pathname.split("/").filter(Boolean).length;
  } catch {
    // ignore
  }
  for (const link of links) {
    try {
      const segments = new URL(link.url).pathname.split("/").filter(Boolean).length;
      max = Math.max(max, segments - basePathSegments);
    } catch {
      // skip
    }
  }
  return max;
}

export async function mapSite(url: string, signal?: AbortSignal): Promise<MapResult | undefined> {
  if (!process.env.FIRECRAWL_API_KEY) return undefined;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getFirecrawlKey()}`,
      },
      body: JSON.stringify({ url, limit: 100 }),
      signal,
    });

    if (!response.ok) return undefined;

    const json = await response.json();
    if (!json.success) return undefined;

    const links: { url: string; title?: string; description?: string }[] = json.links || [];
    return {
      totalPages: links.length,
      sections: categorizeSections(links),
      maxDepth: computeMaxDepth(links, url),
      links,
    };
  } catch {
    // Map is enrichment, not a gate — fail silently
    return undefined;
  }
}

const SECTION_PRIORITY: Record<string, number> = {
  about: 3, services: 3, product: 3, products: 3,
  blog: 2, portfolio: 2, "case-studies": 2, features: 2,
  team: 1, contact: 1, pricing: 1, careers: 1,
};

export function pickSecondaryPages(map: MapResult, primaryUrl: string): string[] {
  const primaryHost = new URL(primaryUrl).hostname;
  const scored: { url: string; score: number }[] = [];

  for (const link of map.links) {
    try {
      const parsed = new URL(link.url);
      if (parsed.hostname !== primaryHost) continue;
      if (link.url === primaryUrl) continue;

      const firstSegment = parsed.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
      if (!firstSegment) continue;

      const score = SECTION_PRIORITY[firstSegment] ?? 0;
      if (score > 0) scored.push({ url: link.url, score });
    } catch {
      // skip invalid
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Dedupe by first path segment — one page per section
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of scored) {
    const segment = new URL(item.url).pathname.split("/").filter(Boolean)[0];
    if (seen.has(segment)) continue;
    seen.add(segment);
    result.push(item.url);
    if (result.length >= 2) break;
  }

  // If no priority pages, pick first 2 internal links
  if (result.length === 0) {
    for (const link of map.links) {
      try {
        if (new URL(link.url).hostname !== primaryHost) continue;
        if (link.url === primaryUrl) continue;
        result.push(link.url);
        if (result.length >= 2) break;
      } catch {
        // skip
      }
    }
  }

  return result;
}

export async function scrapeSecondaryPages(
  urls: string[],
  signal?: AbortSignal,
): Promise<{ url: string; markdown: string; branding?: FirecrawlBranding }[]> {
  if (urls.length === 0) return [];

  const TIMEOUT_MS = 15_000;
  const timeoutController = new AbortController();
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;
  const timerId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

  try {
    const settled = await Promise.allSettled(
        urls.map(async (url) => {
          const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getFirecrawlKey()}`,
            },
            body: JSON.stringify({
              url,
              formats: ["markdown", "branding"],
              onlyMainContent: true,
              timeout: 20000,
            }),
            signal: combinedSignal,
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const json = await response.json();
          if (!json.success) throw new Error(json.error || "scrape failed");

          return {
            url,
            markdown: (json.data?.markdown || "").slice(0, 4000),
            branding: json.data?.branding as FirecrawlBranding | undefined,
          };
        }),
    );

    return settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ url: string; markdown: string; branding?: FirecrawlBranding }>).value);
  } catch {
    // Failure — proceed without secondary data
    return [];
  } finally {
    clearTimeout(timerId);
  }
}
