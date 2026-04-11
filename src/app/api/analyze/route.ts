import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite, mapSite, pickSecondaryPages, scrapeSecondaryPages } from "@/lib/dab/scraper";
import { countMarkdownElements } from "@/lib/dab/parse";
import { analyze } from "@/lib/dab/analyzer";
import type { SiteIntel } from "@/lib/dab/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid URL — must be http or https" }, { status: 400 });
  }

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      let closed = false;
      const close = () => { if (!closed) { closed = true; controller.close(); } };

      try {
        if (signal.aborted) { close(); return; }
        send({ stage: "mapping" });

        const mapResult = await mapSite(url, signal);

        send({
          stage: "mapping-done",
          data: {
            totalPages: mapResult?.totalPages ?? 0,
            sections: mapResult?.sections ?? [],
          },
        });

        if (signal.aborted) { close(); return; }
        send({ stage: "scraping" });

        const scraped = await scrapeWebsite(url, signal);
        const counts = countMarkdownElements(scraped.markdown);

        send({
          stage: "scraped",
          data: {
            title: scraped.metadata.title || scraped.metadata.ogTitle || "",
            headingsCount: counts.headingsCount,
            linksCount: scraped.links?.length || counts.linksCount,
            imagesCount: counts.imagesCount,
            ctasCount: counts.ctasCount,
            colors: scraped.branding?.colors || [],
            fonts: scraped.branding?.fonts || [],
            hasLogo: (scraped.branding?.logos?.length || 0) > 0,
            hasScreenshot: Boolean(scraped.screenshot),
          },
        });

        if (signal.aborted) { close(); return; }

        const intel: SiteIntel = { primary: scraped, map: mapResult ?? undefined };

        if (mapResult && mapResult.links.length > 1) {
          const secondaryUrls = pickSecondaryPages(mapResult, url);
          if (secondaryUrls.length > 0) {
            send({ stage: "deep-scanning", data: { pages: secondaryUrls.length } });
            const secondaryPages = await scrapeSecondaryPages(secondaryUrls, signal);
            intel.secondaryPages = secondaryPages;
            send({ stage: "deep-scanned", data: { pagesScraped: secondaryPages.length } });
          }
        }

        if (signal.aborted) { close(); return; }
        send({ stage: "analyzing" });
        const result = await analyze(intel, signal);

        send({ stage: "done", data: result });
      } catch (error) {
        console.error("Analysis error:", error);
        send({
          stage: "error",
          message: error instanceof Error ? error.message : "Analysis failed",
        });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
