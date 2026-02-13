/**
 * Shared Gemini client for AI extraction tasks.
 * Uses Gemini 2.0 Flash with structured JSON output.
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

export function getGeminiModel(
  modelName = "gemini-2.0-flash",
): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

/**
 * Generate structured JSON from Gemini using responseSchema.
 * Returns the parsed JSON object.
 */
export async function generateStructuredJSON<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  schema: Schema;
  temperature?: number;
  model?: string;
}): Promise<T> {
  const model = getGeminiModel(opts.model);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    systemInstruction: opts.systemPrompt,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      responseMimeType: "application/json",
      responseSchema: opts.schema,
    },
  });

  const text = result.response.text();
  return JSON.parse(text) as T;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
