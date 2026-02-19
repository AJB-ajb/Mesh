import { generateStructuredJSON } from "@/lib/ai/gemini";
import { postingExtractionSchema } from "@/lib/ai/extraction-schemas";
import { POSTING_UPDATE_SYSTEM_PROMPT } from "@/lib/ai/extraction-prompts";
import { withAiExtraction } from "@/lib/api/with-ai-extraction";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * POST /api/extract/posting/update
 * Applies a free-form update instruction to the posting source text,
 * then extracts structured fields from the result.
 */
export const POST = withAiExtraction(async (req, { user, supabase }) => {
  const { postingId, sourceText, updateInstruction } = await req.json();

  if (!postingId || typeof postingId !== "string") {
    return apiError("VALIDATION", "postingId is required", 400);
  }

  if (
    !updateInstruction ||
    typeof updateInstruction !== "string" ||
    updateInstruction.trim().length < 3
  ) {
    return apiError("VALIDATION", "Please provide an update instruction", 400);
  }

  // Verify ownership
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select(
      "creator_id, title, description, category, estimated_time, team_size_max, tags, context_identifier, mode",
    )
    .eq("id", postingId)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Forbidden", 403);
  }

  // Build effective source text
  let effectiveSourceText = "";
  if (
    sourceText &&
    typeof sourceText === "string" &&
    sourceText.trim().length >= 5
  ) {
    effectiveSourceText = sourceText.trim();
  } else {
    const parts: string[] = [];
    if (posting.title) parts.push(`Title: ${posting.title}`);
    if (posting.description) parts.push(`Description: ${posting.description}`);
    if (posting.category) parts.push(`Category: ${posting.category}`);
    if (posting.estimated_time)
      parts.push(`Estimated time: ${posting.estimated_time}`);
    if (posting.team_size_max)
      parts.push(`Team size: ${posting.team_size_max}`);
    if (posting.tags?.length) parts.push(`Tags: ${posting.tags.join(", ")}`);
    if (posting.context_identifier)
      parts.push(`Context: ${posting.context_identifier}`);
    if (posting.mode) parts.push(`Mode: ${posting.mode}`);
    effectiveSourceText = parts.join("\n");

    if (!effectiveSourceText) {
      effectiveSourceText = "New posting with no existing information.";
    }
  }

  const result = await generateStructuredJSON<Record<string, unknown>>({
    systemPrompt: POSTING_UPDATE_SYSTEM_PROMPT,
    userPrompt: `Current posting description:\n\n${effectiveSourceText}\n\nUpdate instruction: ${updateInstruction.trim()}`,
    schema: postingExtractionSchema("update"),
    temperature: 0.3,
  });

  const { updated_text, ...extractedPosting } = result;

  return apiSuccess({
    success: true,
    updatedSourceText: updated_text,
    extractedPosting,
  });
});
