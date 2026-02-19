import { generateStructuredJSON } from "@/lib/ai/gemini";
import { profileExtractionSchema } from "@/lib/ai/extraction-schemas";
import { PROFILE_UPDATE_SYSTEM_PROMPT } from "@/lib/ai/extraction-prompts";
import { withAiExtraction } from "@/lib/api/with-ai-extraction";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * POST /api/extract/profile/update
 * Applies a free-form update instruction to the profile source text,
 * then extracts structured fields from the result.
 */
export const POST = withAiExtraction(async (req, { user, supabase }) => {
  const { sourceText, updateInstruction } = await req.json();

  if (
    !updateInstruction ||
    typeof updateInstruction !== "string" ||
    updateInstruction.trim().length < 3
  ) {
    return apiError("VALIDATION", "Please provide an update instruction", 400);
  }

  // If sourceText is provided, use it. Otherwise, build from DB profile.
  let effectiveSourceText = "";
  if (
    sourceText &&
    typeof sourceText === "string" &&
    sourceText.trim().length >= 5
  ) {
    effectiveSourceText = sourceText.trim();
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, headline, bio, skills, interests, location, languages, portfolio_url, github_url",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      const parts: string[] = [];
      if (profile.full_name) parts.push(`Name: ${profile.full_name}`);
      if (profile.headline) parts.push(`Headline: ${profile.headline}`);
      if (profile.bio) parts.push(`Bio: ${profile.bio}`);
      if (profile.skills?.length)
        parts.push(`Skills: ${profile.skills.join(", ")}`);
      if (profile.interests?.length)
        parts.push(`Interests: ${profile.interests.join(", ")}`);
      if (profile.location) parts.push(`Location: ${profile.location}`);
      if (profile.languages?.length)
        parts.push(`Languages: ${profile.languages.join(", ")}`);
      if (profile.portfolio_url)
        parts.push(`Portfolio: ${profile.portfolio_url}`);
      if (profile.github_url) parts.push(`GitHub: ${profile.github_url}`);
      effectiveSourceText = parts.join("\n");
    }

    if (!effectiveSourceText) {
      effectiveSourceText = "New profile with no existing information.";
    }
  }

  const result = await generateStructuredJSON<Record<string, unknown>>({
    systemPrompt: PROFILE_UPDATE_SYSTEM_PROMPT,
    userPrompt: `Current profile description:\n\n${effectiveSourceText}\n\nUpdate instruction: ${updateInstruction.trim()}`,
    schema: profileExtractionSchema("update"),
    temperature: 0.3,
  });

  // Parse skill_levels from JSON string back to object
  if (typeof result.skill_levels === "string") {
    try {
      result.skill_levels = JSON.parse(result.skill_levels as string);
    } catch {
      // If parsing fails, leave as-is — downstream code can handle it
    }
  }

  const { updated_text, ...extractedProfile } = result;

  return apiSuccess({
    success: true,
    updatedSourceText: updated_text,
    extractedProfile,
  });
});
