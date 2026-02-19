import { generateStructuredJSON } from "@/lib/ai/gemini";
import { postingExtractionSchema } from "@/lib/ai/extraction-schemas";
import { POSTING_EXTRACT_SYSTEM_PROMPT } from "@/lib/ai/extraction-prompts";
import { withAiExtraction } from "@/lib/api/with-ai-extraction";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * POST /api/extract/posting
 * Extracts posting information from unstructured text using Gemini.
 */
export const POST = withAiExtraction(async (req) => {
  const { text } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return apiError(
      "VALIDATION",
      "Please provide more text to extract posting information from",
      400,
    );
  }

  const extractedPosting = await generateStructuredJSON({
    systemPrompt: POSTING_EXTRACT_SYSTEM_PROMPT,
    userPrompt: `Extract posting information from this text:\n\n${text}`,
    schema: postingExtractionSchema("extract"),
    temperature: 0.3,
  });

  return apiSuccess({ success: true, posting: extractedPosting });
});
