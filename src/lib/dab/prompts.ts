import type { SiteIntel } from "./types";

export const SYSTEM_PROMPT = `You are a senior brand strategist and design expert at FLOC*, a Web3 strategic design studio. You analyze brands through the lens of the DAB* (Decentralized Autonomous Brand) framework. Your analysis is sharp, specific, and honest. You never give generic feedback — you always reference specific elements from the data.`;

export function buildUserPrompt(intel: SiteIntel): string {
  const scraped = intel.primary;
  const content = scraped.markdown.slice(0, 8000);
  const b = scraped.branding;

  const brandingBlock = b
    ? [
        b.colors?.length ? `Colors: ${b.colors.join(", ")}` : null,
        b.fonts?.length ? `Fonts: ${b.fonts.join(", ")}` : null,
        b.logos?.length ? `Logos detected: ${b.logos.length}` : "No logos detected",
        b.personalityTraits?.length ? `Brand personality: ${b.personalityTraits.join(", ")}` : null,
        b.typography ? `Typography system: ${JSON.stringify(b.typography)}` : null,
        b.spacing ? `Spacing system: ${JSON.stringify(b.spacing)}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No branding data available";

  return `Analyze this website's brand and return a structured JSON assessment.

Website: ${scraped.metadata.ogTitle || scraped.metadata.title || "Unknown"}
Description: ${scraped.metadata.description || scraped.metadata.ogDescription || "None"}
OG Image: ${scraped.metadata.ogImage || "None"}

Visual identity (extracted from the live site):
${brandingBlock}

Page content (markdown):
${content}

${scraped.links && scraped.links.length > 0 ? `Links found on the page (${scraped.links.length} total):\n${scraped.links.slice(0, 30).join("\n")}` : ""}

${intel.map ? `Site structure (from sitemap scan):
- Total discoverable pages: ${intel.map.totalPages}
- Sections detected: ${intel.map.sections.length > 0 ? intel.map.sections.join(", ") : "None clearly identifiable"}
- Maximum navigation depth: ${intel.map.maxDepth} levels
- Sample pages:\n${intel.map.links.slice(0, 15).map((l) => l.url).join("\n")}` : ""}

${intel.secondaryPages && intel.secondaryPages.length > 0 ? `Cross-page analysis (${intel.secondaryPages.length} additional pages scraped):

${intel.secondaryPages.map((p, i) => `--- Page ${i + 2}: ${p.url} ---\n${p.markdown}`).join("\n\n")}

Secondary page branding signals:
${intel.secondaryPages.map((p) => p.branding ? `${p.url}: colors=${p.branding.colors?.join(",") || "none"}, fonts=${p.branding.fonts?.join(",") || "none"}` : `${p.url}: no branding data`).join("\n")}` : ""}

Score the brand on these 5 categories (0-100 each):
1. VISUAL SYSTEM — Logo presence, color consistency, typography hierarchy, visual identity strength. Can an AI agent reproduce the visual style consistently?
2. VOICE — Tone of voice clarity, messaging consistency, copy quality, personality distinctiveness. Could an AI agent write in this brand's voice?
3. ARCHITECTURE — ${intel.map ? "Use the site structure data above (page count, sections, depth, navigation patterns) to evaluate" : "Evaluate based on the visible navigation, link structure, and content hierarchy of this single page:"} information hierarchy, section organization, content structure, and user journey logic. Is the brand system logically organized?
4. AUTONOMY — Overall: how well-codified is this brand? Could it operate without its founder? Is the brand system documented enough for AI execution?
5. CONSISTENCY — ${intel.secondaryPages && intel.secondaryPages.length > 0 ? `Compare the primary page against the ${intel.secondaryPages.length} additional pages above. Look for visual identity drift (different colors, fonts, logo treatment), voice shifts (tone changes between sections), and structural inconsistencies. Score based on how unified the brand feels ACROSS pages.` : "Cross-element coherence: do visuals, voice, and architecture feel like one unified brand?"}

For each, give a score and a short label (2-3 words max).

Then provide:
- An overall score using this exact formula: score = round((visual + voice + architecture + consistency + autonomy * 2) / 6). Do NOT deviate from this formula
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
