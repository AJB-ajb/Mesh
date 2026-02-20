import { generateStructuredJSON } from "@/lib/ai/gemini";
import { profileExtractionSchema } from "@/lib/ai/extraction-schemas";
import { PROFILE_EXTRACT_SYSTEM_PROMPT } from "@/lib/ai/extraction-prompts";
import { withAiExtraction } from "@/lib/api/with-ai-extraction";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

/**
 * POST /api/extract/profile
 * Extracts profile information from unstructured text using Gemini.
 */
export const POST = withAiExtraction(async (req) => {
  const { text } = await parseBody<{ text?: string }>(req);

  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return apiError(
      "VALIDATION",
      "Please provide more text to extract profile information from",
      400,
    );
  }

  const extractedProfile = await generateStructuredJSON({
    systemPrompt: PROFILE_EXTRACT_SYSTEM_PROMPT,
    userPrompt: `Extract profile information from this text:\n\n${text}`,
    schema: profileExtractionSchema("extract"),
    temperature: 0.3,
  });

  return apiSuccess({ success: true, profile: extractedProfile });
});
