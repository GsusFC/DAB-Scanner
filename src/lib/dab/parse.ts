import type { AnalysisResult } from "./types";

export function parseAnalysisJSON(text: string): AnalysisResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");

  let jsonStr = jsonMatch[0];
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
  jsonStr = jsonStr.replace(/,\s*,/g, ",");

  const raw = JSON.parse(jsonStr);

  // Validate required fields
  if (
    typeof raw.score !== "number" ||
    typeof raw.survivalDays !== "number" ||
    !raw.categories ||
    !Array.isArray(raw.strengths) ||
    !Array.isArray(raw.weaknesses) ||
    typeof raw.verdict !== "string"
  ) {
    throw new Error("AI response is missing required fields");
  }

  const result: AnalysisResult = {
    score: raw.score,
    survivalDays: raw.survivalDays,
    categories: raw.categories,
    strengths: raw.strengths.slice(0, 5),
    weaknesses: raw.weaknesses.slice(0, 5),
    verdict: raw.verdict,
    brandName: raw.brandName || "Unknown",
  };

  // Enforce deterministic score formula
  if (result.categories) {
    const c = result.categories;
    const expected = Math.round(
      ((c.visual?.score || 0) +
        (c.voice?.score || 0) +
        (c.architecture?.score || 0) +
        (c.consistency?.score || 0) +
        (c.autonomy?.score || 0) * 2) / 6,
    );
    if (result.score !== expected) {
      result.score = expected;
    }
  }

  return result;
}

export function countMarkdownElements(markdown: string) {
  const headingsCount = (markdown.match(/^#{1,3}\s/gm) || []).length;
  const linksCount = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length;
  const imagesCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const ctasCount = (markdown.match(/\[.*?(get started|sign up|book|contact|try|start|join|subscribe|buy|learn more).*?\]/gi) || []).length;
  return { headingsCount, linksCount, imagesCount, ctasCount };
}
