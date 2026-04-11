import type { SiteIntel, AnalysisResult } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { parseAnalysisJSON } from "./parse";

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

export async function analyze(intel: SiteIntel, signal?: AbortSignal): Promise<AnalysisResult> {
  const client = await getClient();
  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || "gemini-2.0-flash",
    max_tokens: 2000,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(intel) },
    ],
  }, { signal });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("No response from AI");

  return parseAnalysisJSON(text);
}
