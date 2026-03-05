/**
 * Shared Gemini client for AI extraction tasks.
 * Includes automatic fallback across models on transient errors
 * (429 rate-limit, 503 high demand, timeouts).
 */

import {
  GoogleGenerativeAI,
  type Content,
  type GenerateContentResult,
  type GenerationConfig,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";
import { GEMINI_MODELS, GEMINI_TIMEOUT_MS } from "@/lib/constants";
import { withTimeout } from "./timeout";

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

function getGeminiModel(modelName: string): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

/** Errors that should trigger a fallback to the next model. */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    msg.includes("timed out")
  );
}

export type ModelTier = "fast" | "standard";

/**
 * Generate structured JSON from Gemini using responseSchema.
 * Automatically falls back to next model on transient errors.
 */
export async function generateStructuredJSON<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  schema: Schema;
  temperature?: number;
  model?: string;
  tier?: ModelTier;
}): Promise<T> {
  const models = GEMINI_MODELS[opts.tier ?? "standard"];
  let lastError: unknown;

  for (const modelName of models) {
    try {
      const model = getGeminiModel(modelName);
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
          systemInstruction: opts.systemPrompt,
          generationConfig: {
            temperature: opts.temperature ?? 0.3,
            responseMimeType: "application/json",
            responseSchema: opts.schema,
          },
        }),
        GEMINI_TIMEOUT_MS,
        "Gemini generateContent",
      );

      const text = result.response.text();
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (!isTransientError(error)) throw error;
      console.warn(
        `Gemini model ${modelName} failed (${error instanceof Error ? error.message.slice(0, 80) : "unknown"}), trying next model...`,
      );
    }
  }

  throw lastError;
}

/**
 * Generate content with automatic model fallback on transient errors.
 * For non-structured calls (e.g. match explanations).
 */
export async function generateContentWithFallback(opts: {
  contents: Content[];
  generationConfig?: GenerationConfig;
  tier?: ModelTier;
}): Promise<GenerateContentResult> {
  const models = GEMINI_MODELS[opts.tier ?? "standard"];
  let lastError: unknown;

  for (const modelName of models) {
    try {
      const model = getGeminiModel(modelName);
      return await withTimeout(
        model.generateContent({
          contents: opts.contents,
          generationConfig: opts.generationConfig,
        }),
        GEMINI_TIMEOUT_MS,
        "Gemini generateContent",
      );
    } catch (error) {
      lastError = error;
      if (!isTransientError(error)) throw error;
      console.warn(
        `Gemini model ${modelName} failed (${error instanceof Error ? error.message.slice(0, 80) : "unknown"}), trying next model...`,
      );
    }
  }

  throw lastError;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
