import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Compatible with any OpenAI-compatible API:
// - Gemini:  AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai  AI_MODEL=gemini-2.0-flash
// - Groq:    AI_BASE_URL=https://api.groq.com/openai/v1                          AI_MODEL=llama-3.3-70b-versatile
// - Nous:    AI_BASE_URL=https://inference-api.nousresearch.com/v1                AI_MODEL=deepseek/deepseek-v3.2
// - OpenAI:  (no AI_BASE_URL needed)                                              AI_MODEL=gpt-4o
async function getClient() {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing AI_API_KEY environment variable");
  }

  return new OpenAI({
    apiKey,
    ...(process.env.AI_BASE_URL && { baseURL: process.env.AI_BASE_URL }),
  });
}

async function scrapeWebsite(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Capture style tags before stripping non-visible elements from the DOM.
    const styleContent: string[] = [];
    $("style").each((_, el) => {
      styleContent.push($(el).text().slice(0, 2000));
    });

    // Remove scripts and non-visible elements
    $("script, noscript, iframe, svg").remove();

    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDescription =
      $('meta[property="og:description"]').attr("content") || "";

    // Extract colors from inline styles
    const inlineStyles: string[] = [];
    $("[style]").each((_, el) => {
      const style = $(el).attr("style");
      if (style) inlineStyles.push(style);
    });

    // Get all visible text
    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    // Get headings
    const headings: string[] = [];
    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    // Get navigation items
    const navItems: string[] = [];
    $("nav a, header a, .nav a, .navbar a").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 50) navItems.push(text);
    });

    // Get links
    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        links.push(href);
      }
    });

    // Get images and their alt text
    const images: { src: string; alt: string }[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      const alt = $(el).attr("alt") || "";
      if (src) images.push({ src: src.slice(0, 200), alt });
    });

    // Get CSS links for font analysis
    const fontLinks: string[] = [];
    $('link[rel="stylesheet"], link[href*="font"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) fontLinks.push(href);
    });

    // Get CTA buttons
    const ctas: string[] = [];
    $('button, a.btn, a.button, [class*="cta"], [class*="btn"]').each(
      (_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 50) ctas.push(text);
      }
    );

    return {
      url,
      title,
      metaDescription,
      ogTitle,
      ogDescription,
      headings: headings.slice(0, 20),
      navItems: [...new Set(navItems)].slice(0, 15),
      bodyText,
      links: links.slice(0, 30),
      images: images.slice(0, 15),
      fontLinks: fontLinks.slice(0, 5),
      inlineStyles: inlineStyles.slice(0, 20),
      styleContent: styleContent.slice(0, 3),
      ctas: ctas.slice(0, 10),
    };
  } catch (error) {
    throw new Error(
      `Failed to scrape: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

const SYSTEM_PROMPT = `You are a senior brand strategist and design expert at FLOC*, a Web3 strategic design studio. You analyze brands through the lens of the DAB* (Decentralized Autonomous Brand) framework. Your analysis is sharp, specific, and honest. You never give generic feedback — you always reference specific elements from the data.`;

function buildUserPrompt(siteData: Record<string, unknown>) {
  return `Analyze this website's brand and return a structured JSON assessment.

Website data:
${JSON.stringify(siteData, null, 2)}

Score the brand on these 5 categories (0-100 each):
1. VISUAL SYSTEM — Logo presence, color consistency, typography hierarchy, visual identity strength. Can an AI agent reproduce the visual style consistently?
2. VOICE — Tone of voice clarity, messaging consistency, copy quality, personality distinctiveness. Could an AI agent write in this brand's voice?
3. ARCHITECTURE — Information hierarchy, navigation clarity, content structure, user journey logic. Is the brand system logically organized?
4. AUTONOMY — Overall: how well-codified is this brand? Could it operate without its founder? Is the brand system documented enough for AI execution?
5. CONSISTENCY — Cross-element coherence: do visuals, voice, and architecture feel like one unified brand?

For each, give a score and a short label (2-3 words max).

Then provide:
- An overall score (weighted average, autonomy counts double)
- "survivalDays": estimate how many days this brand could maintain quality output without its founder (1-365)
- 3 specific strengths with title (max 5 words) and detail (1 sentence, referencing actual elements)
- 3 specific weaknesses with title (max 5 words) and detail (1 sentence, referencing actual elements)
- A one-line verdict (max 15 words) about the brand's autonomy readiness
- The brand name (extract from the site title or headings)

Respond ONLY with valid JSON in this exact format, no markdown, no code blocks:
{
  "score": number,
  "survivalDays": number,
  "categories": {
    "visual": { "score": number, "label": "string" },
    "voice": { "score": number, "label": "string" },
    "architecture": { "score": number, "label": "string" },
    "autonomy": { "score": number, "label": "string" },
    "consistency": { "score": number, "label": "string" }
  },
  "strengths": [{ "title": "string", "detail": "string" }],
  "weaknesses": [{ "title": "string", "detail": "string" }],
  "verdict": "string",
  "brandName": "string"
}`;
}

function parseAnalysisJSON(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");

  let jsonStr = jsonMatch[0];
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
  jsonStr = jsonStr.replace(/,\s*,/g, ",");

  return JSON.parse(jsonStr);
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        send({ stage: "scraping" });

        const siteData = await scrapeWebsite(url);

        send({
          stage: "scraped",
          data: {
            title: siteData.title,
            headingsCount: siteData.headings.length,
            linksCount: siteData.links.length,
            imagesCount: siteData.images.length,
            ctasCount: siteData.ctas.length,
          },
        });

        send({ stage: "analyzing" });

        const client = await getClient();
        const completion = await client.chat.completions.create({
          model: process.env.AI_MODEL || "gemini-2.0-flash",
          max_tokens: 2000,
          temperature: 0.3,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(siteData) },
          ],
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) throw new Error("No response from AI");

        const analysis = parseAnalysisJSON(text);

        send({ stage: "done", data: analysis });
      } catch (error) {
        console.error("Analysis error:", error);
        send({
          stage: "error",
          message: error instanceof Error ? error.message : "Analysis failed",
        });
      } finally {
        controller.close();
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
