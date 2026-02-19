/**
 * Auth + Gemini middleware for AI extraction API routes.
 * Composes `withAuth` with a Gemini configuration check.
 */

import { withAuth, type AuthContext } from "./with-auth";
import { apiError } from "@/lib/errors";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import type { NextResponse } from "next/server";

export type AiExtractionHandler = (
  req: Request,
  ctx: AuthContext,
) => Promise<NextResponse>;

export function withAiExtraction(handler: AiExtractionHandler) {
  return withAuth(async (req, ctx) => {
    if (!isGeminiConfigured()) {
      return apiError("INTERNAL", "Gemini API key not configured", 503);
    }
    return handler(req, ctx);
  });
}
