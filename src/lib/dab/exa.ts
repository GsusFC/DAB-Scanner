import type { ExaIntel } from "./types";

const EXA_API_URL = "https://api.exa.ai/search";

type ExaResult = {
  title?: string;
  url: string;
  text?: string;
  highlights?: string[];
};

async function exaSearch(query: string, numResults: number, signal?: AbortSignal): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(EXA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: "neural",
        useAutoprompt: true,
        contents: { highlights: { numSentences: 3 } },
      }),
      signal,
    });

    if (!response.ok) return [];
    const json = await response.json();
    return json.results || [];
  } catch {
    return [];
  }
}

function extractFromHighlights(results: ExaResult[]): {
  industry?: string;
  competitors: string[];
  employeeCount?: string;
  categories: string[];
  recentNews: string[];
  description?: string;
} {
  const allText = results.map((r) => (r.highlights || []).join(" ")).join(" ");

  // Extract industry
  const industryMatch = allText.match(/Industry:\s*([^\n•\-]+)/i);
  const industry = industryMatch?.[1]?.trim();

  // Extract employee count
  const empMatch = allText.match(/(\d[\d,]+)\s*(?:employees|people)/i);
  const employeeCount = empMatch?.[1];

  // Extract competitors
  const compMatch = allText.match(/Competitors?\s*[:\n]?\s*([^\n]+)/i);
  const competitors = compMatch?.[1]
    ? compMatch[1].split(/[,;]/).map((c) => c.trim()).filter((c) => c.length > 1 && c.length < 40).slice(0, 5)
    : [];

  // Extract categories
  const catMatch = allText.match(/Categories?\s*[:\n]?\s*([^\n]+)/i);
  const categories = catMatch?.[1]
    ? catMatch[1].split(/[,;]/).map((c) => c.trim()).filter((c) => c.length > 1 && c.length < 30).slice(0, 8)
    : [];

  // Extract recent news
  const newsMatches = allText.match(/\[\d{4}-\d{2}-\d{2}\]\s*[^[]+/g);
  const recentNews = (newsMatches || []).slice(0, 3).map((n) => n.trim());

  // Extract description
  const aboutMatch = allText.match(/## About\s+([^#]+)/i);
  const description = aboutMatch?.[1]?.trim().slice(0, 300);

  return { industry, competitors, employeeCount, categories, recentNews, description };
}

function extractSocialProfiles(results: ExaResult[]): { platform: string; url: string; followers?: string }[] {
  const profiles: { platform: string; url: string; followers?: string }[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    const url = r.url.toLowerCase();
    let platform: string | null = null;

    if (url.includes("instagram.com")) platform = "Instagram";
    else if (url.includes("linkedin.com/company")) platform = "LinkedIn";
    else if (url.includes("twitter.com") || url.includes("x.com")) platform = "X/Twitter";
    else if (url.includes("youtube.com")) platform = "YouTube";
    else if (url.includes("tiktok.com")) platform = "TikTok";
    else if (url.includes("facebook.com")) platform = "Facebook";

    if (platform && !seen.has(platform)) {
      seen.add(platform);
      const followersMatch = (r.highlights || []).join(" ").match(/([\d,.]+[KMB]?)\s*followers/i);
      profiles.push({ platform, url: r.url, followers: followersMatch?.[1] });
    }
  }

  return profiles;
}

export async function enrichWithExa(brandName: string, url: string, signal?: AbortSignal): Promise<ExaIntel | undefined> {
  if (!process.env.EXA_API_KEY) return undefined;

  try {
    const [companyResults, socialResults] = await Promise.all([
      exaSearch(`category:company ${brandName}`, 3, signal),
      exaSearch(`${brandName} official social media accounts Instagram LinkedIn Twitter`, 5, signal),
    ]);

    if (companyResults.length === 0 && socialResults.length === 0) return undefined;

    const extracted = extractFromHighlights(companyResults);
    const socialProfiles = extractSocialProfiles(socialResults);

    return {
      industry: extracted.industry,
      competitors: extracted.competitors,
      employeeCount: extracted.employeeCount,
      categories: extracted.categories,
      recentNews: extracted.recentNews,
      socialProfiles,
      description: extracted.description,
    };
  } catch {
    return undefined;
  }
}
