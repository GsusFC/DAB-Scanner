import type { SiteIntel } from "./types";

export const SYSTEM_PROMPT = `You are a senior brand strategist and design systems expert at FLOC*, a Web3 strategic design studio. You specialize in the DAB* (Decentralized Autonomous Brand) framework — evaluating whether a brand can operate, produce content, and maintain quality without direct founder involvement.

Your analysis is:
- SHARP: reference specific elements from the data, never give generic feedback
- HONEST: low scores are acceptable and expected for early-stage brands
- ACTIONABLE: every observation should point to something the brand can fix
- DATA-DRIVEN: base scores on evidence from the extracted signals, not assumptions`;

function buildBrandingBlock(intel: SiteIntel): string {
  const b = intel.primary.branding;
  if (!b) return "No branding data extracted from the site.";

  return [
    b.colors?.length ? `Colors in use: ${b.colors.join(", ")}` : "No color palette detected",
    b.fonts?.length ? `Typefaces: ${b.fonts.join(", ")}` : "No fonts detected",
    b.logos?.length ? `Logos: ${b.logos.length} detected` : "No logos detected",
    b.personalityTraits?.length ? `Personality traits: ${b.personalityTraits.join(", ")}` : null,
    b.typography ? `Typography system: ${JSON.stringify(b.typography)}` : null,
    b.spacing ? `Spacing tokens: ${JSON.stringify(b.spacing)}` : null,
  ].filter(Boolean).join("\n");
}

function buildMapBlock(intel: SiteIntel): string {
  if (!intel.map) return "";
  const m = intel.map;
  return `
Site structure (${m.totalPages} pages discovered):
- Sections: ${m.sections.length > 0 ? m.sections.join(", ") : "No clearly identifiable sections"}
- Navigation depth: ${m.maxDepth} levels
- Sample URLs:\n${m.links.slice(0, 12).map((l) => `  ${l.url}`).join("\n")}`;
}

function buildCrossPageBlock(intel: SiteIntel): string {
  if (!intel.secondaryPages?.length) return "";
  return `
Cross-page analysis (${intel.secondaryPages.length} internal pages scraped):
${intel.secondaryPages.map((p, i) => {
    const brandSignals = p.branding
      ? `colors=${p.branding.colors?.join(",") || "none"}, fonts=${p.branding.fonts?.join(",") || "none"}`
      : "no branding data";
    return `--- Page ${i + 2}: ${p.url} ---
Branding: ${brandSignals}
Content preview:
${p.markdown.slice(0, 2000)}`;
  }).join("\n\n")}`;
}

function buildExaBlock(intel: SiteIntel): string {
  if (!intel.exa) return "";
  const e = intel.exa;
  const parts: string[] = [];

  if (e.industry) parts.push(`Industry: ${e.industry}`);
  if (e.description) parts.push(`About: ${e.description}`);
  if (e.employeeCount) parts.push(`Team size: ${e.employeeCount} employees`);
  if (e.competitors?.length) parts.push(`Competitors: ${e.competitors.join(", ")}`);
  if (e.categories?.length) parts.push(`Market categories: ${e.categories.join(", ")}`);
  if (e.socialProfiles?.length) {
    parts.push(`Social presence:\n${e.socialProfiles.map((s) =>
      `  ${s.platform}: ${s.url}${s.followers ? ` (${s.followers} followers)` : ""}`
    ).join("\n")}`);
  }
  if (e.recentNews?.length) {
    parts.push(`Recent activity:\n${e.recentNews.map((n) => `  ${n}`).join("\n")}`);
  }

  return parts.length > 0 ? `\nMarket intelligence (external sources):\n${parts.join("\n")}` : "";
}

export function buildUserPrompt(intel: SiteIntel): string {
  const scraped = intel.primary;
  const content = scraped.markdown.slice(0, 8000);

  const hasMap = Boolean(intel.map);
  const hasCrossPage = Boolean(intel.secondaryPages?.length);
  const hasExa = Boolean(intel.exa);

  return `Analyze this website's brand autonomy and return a structured JSON assessment.

== BRAND IDENTITY ==
Name: ${scraped.metadata.ogTitle || scraped.metadata.title || "Unknown"}
Description: ${scraped.metadata.description || scraped.metadata.ogDescription || "Not provided"}
OG Image: ${scraped.metadata.ogImage || "None"}

== VISUAL SYSTEM ==
${buildBrandingBlock(intel)}

== PAGE CONTENT ==
${content}

${scraped.links?.length ? `== LINK STRUCTURE (${scraped.links.length} links) ==\n${scraped.links.slice(0, 25).join("\n")}` : ""}
${buildMapBlock(intel)}
${buildCrossPageBlock(intel)}
${buildExaBlock(intel)}

== SCORING INSTRUCTIONS ==

Score the brand on these 5 categories (0-100 each). Be precise — use the full range. A score of 30 is fine for a brand with real gaps.

1. VISUAL SYSTEM (0-100)
   Evaluate: color palette definition, typography hierarchy, logo presence and treatment, visual asset consistency.
   ${intel.primary.branding ? "Use the extracted colors, fonts, and logo data above." : "Note: no branding data was extracted — score based on whatever visual signals appear in the content."}
   Key question: Could an AI agent reproduce this visual identity consistently?

2. VOICE (0-100)
   Evaluate: tone distinctiveness, vocabulary patterns, messaging clarity, personality consistency.
   ${hasCrossPage ? "Compare voice across the primary page and secondary pages — is the tone consistent?" : "Evaluate based on the copy visible on this single page."}
   ${hasExa && intel.exa?.socialProfiles?.length ? "Consider that this brand has active social channels — voice should extend beyond the website." : ""}
   Key question: Could an AI agent write in this brand's voice after studying these pages?

3. ARCHITECTURE (0-100)
   Evaluate: information hierarchy, navigation clarity, section organization, content coverage.
   ${hasMap ? `Use the site structure data: ${intel.map!.totalPages} pages, ${intel.map!.sections.length} sections, depth ${intel.map!.maxDepth}.` : "Evaluate based on the visible navigation and link structure of this single page."}
   ${hasExa && intel.exa?.industry ? `For a ${intel.exa.industry} company, assess whether key sections (about, product, blog, contact) are present and well-organized.` : ""}
   Key question: Is the brand system logically organized for both humans and AI to navigate?

4. AUTONOMY (0-100) — WEIGHTED DOUBLE
   Evaluate: how codified is the brand system? Could someone (or an AI) execute brand-consistent output without the founder?
   Consider: documented guidelines, repeatable patterns, asset availability, operational maturity.
   ${hasExa && intel.exa?.employeeCount ? `Team of ${intel.exa.employeeCount} — factor in organizational maturity.` : ""}
   Key question: How many days could this brand maintain quality output without its creator?

5. CONSISTENCY (0-100)
   ${hasCrossPage ? `Compare the primary page against ${intel.secondaryPages!.length} additional pages. Look for: visual identity drift (color/font changes), voice shifts, structural inconsistencies. Score how unified the brand feels ACROSS pages.` : "Evaluate internal coherence within this single page — do visuals, voice, and structure feel like one unified system?"}
   ${hasExa && intel.exa?.socialProfiles?.length ? "Consider whether the brand presence extends consistently to social channels." : ""}
   Key question: Does everything feel like it belongs to the same brand?

For each category, provide a score and a short label (2-3 words max, e.g. "Strong Voice", "Needs Work").

== OUTPUT ==

Calculate the overall score: score = round((visual + voice + architecture + consistency + autonomy * 2) / 6)
Do NOT deviate from this formula.

Respond ONLY with valid JSON, no markdown fences:
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
  "strengths": [{ "title": "string (max 5 words)", "detail": "string (1 sentence, reference specific elements)" }],
  "weaknesses": [{ "title": "string (max 5 words)", "detail": "string (1 sentence, reference specific elements)" }],
  "verdict": "string (max 15 words — the single-line brand autonomy verdict)",
  "brandName": "string"
}`;
}
