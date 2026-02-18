/**
 * Shared Gemini client for AI extraction tasks.
 * Includes automatic fallback across models on 429 rate-limit errors.
 */

import {
  GoogleGenerativeAI,
  type Content,
  type GenerateContentResult,
  type GenerationConfig,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";
import { GEMINI_MODELS } from "@/lib/constants";

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

function getGeminiModel(modelName = "gemini-2.0-flash"): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

/**
 * Generate structured JSON from Gemini using responseSchema.
 * Automatically falls back to next model on 429 rate-limit errors.
 */
export async function generateStructuredJSON<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  schema: Schema;
  temperature?: number;
  model?: string;
}): Promise<T> {
  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = getGeminiModel(modelName);
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
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error)) throw error;
      console.warn(
        `Gemini model ${modelName} rate-limited (429), trying next model...`,
      );
    }
  }

  throw lastError;
}

/**
 * Generate content with automatic model fallback on 429 rate-limit errors.
 * For non-structured calls (e.g. match explanations).
 */
export async function generateContentWithFallback(opts: {
  contents: Content[];
  generationConfig?: GenerationConfig;
}): Promise<GenerateContentResult> {
  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = getGeminiModel(modelName);
      return await model.generateContent({
        contents: opts.contents,
        generationConfig: opts.generationConfig,
      });
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error)) throw error;
      console.warn(
        `Gemini model ${modelName} rate-limited (429), trying next model...`,
      );
    }
  }

  throw lastError;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
