import { withAuth } from "@/lib/api/with-auth";
import {
  validatePostingBody,
  buildPostingDbRow,
  type PostingBody,
} from "@/lib/api/postings-validation";
import { triggerEmbeddingGenerationServer } from "@/lib/api/trigger-embedding-server";
import { apiSuccess, apiError, parseBody, AppError } from "@/lib/errors";

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await parseBody<PostingBody>(req);

  validatePostingBody(body, "create");

  // Auto-generate title from description if not provided
  const title =
    (body.title ?? "").trim() ||
    (body.description ?? "").trim().split(/[.\n]/)[0].slice(0, 100) ||
    "Untitled Posting";

  // Ensure user has a profile (required for creator_id FK)
  const { data: profile, error: profileCheckError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (profileCheckError && profileCheckError.code !== "PGRST116") {
    throw new AppError("INTERNAL", "Failed to verify profile", 500);
  }

  if (!profile) {
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: user.id,
      full_name:
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    });

    if (profileError) {
      return apiError(
        "INTERNAL",
        `Failed to create user profile: ${profileError.message || "Please try again."}`,
        500,
      );
    }
  }

  const dbRow = buildPostingDbRow(body, "create");

  const { data: posting, error: insertError } = await supabase
    .from("postings")
    .insert({
      ...dbRow,
      title,
      creator_id: user.id,
      status: "open",
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23503") {
      return apiError(
        "VALIDATION",
        "Your profile is missing. Please complete your profile first.",
        400,
      );
    }
    if (insertError.code === "23505") {
      return apiError(
        "CONFLICT",
        "A posting with this information already exists.",
        409,
      );
    }
    if (insertError.code === "23514") {
      return apiError(
        "VALIDATION",
        `Invalid posting data: ${insertError.message}`,
        400,
      );
    }
    return apiError(
      "INTERNAL",
      `Failed to create posting: ${insertError.message || "Please try again."}`,
      500,
    );
  }

  // Insert posting_skills
  if (body.selectedSkills && body.selectedSkills.length > 0) {
    const postingSkillRows = body.selectedSkills.map((s) => ({
      posting_id: posting.id,
      skill_id: s.skillId,
      level_min: s.levelMin,
    }));
    await supabase.from("posting_skills").insert(postingSkillRows);
  }

  // Insert availability_windows
  if (
    body.availabilityMode !== "flexible" &&
    body.availabilityWindows &&
    body.availabilityWindows.length > 0
  ) {
    const windowRows = body.availabilityWindows.map((w) => ({
      posting_id: posting.id,
      window_type: "recurring" as const,
      day_of_week: w.day_of_week,
      start_minutes: w.start_minutes,
      end_minutes: w.end_minutes,
    }));
    await supabase.from("availability_windows").insert(windowRows);
  }

  // Trigger embedding generation (fire-and-forget)
  triggerEmbeddingGenerationServer().catch(() => {});

  return apiSuccess({ posting }, 201);
});
