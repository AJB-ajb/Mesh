import { withAuth } from "@/lib/api/with-auth";
import {
  validatePostingBody,
  buildPostingDbRow,
  type PostingBody,
} from "@/lib/api/postings-validation";
import { apiSuccess, apiError, parseBody, AppError } from "@/lib/errors";

export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;
  const body = await parseBody<PostingBody>(req);

  validatePostingBody(body, "edit");

  // Fetch posting to verify ownership
  const { data: posting, error: fetchError } = await supabase
    .from("postings")
    .select("id, creator_id")
    .eq("id", postingId)
    .single();

  if (fetchError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    throw new AppError("FORBIDDEN", "Not authorized to edit this posting", 403);
  }

  const dbRow = buildPostingDbRow(body, "edit");

  const { data: updated, error: updateError } = await supabase
    .from("postings")
    .update(dbRow)
    .eq("id", postingId)
    .select()
    .single();

  if (updateError) {
    return apiError(
      "INTERNAL",
      `Failed to update posting: ${updateError.message}`,
      500,
    );
  }

  // Sync posting_skills
  await supabase.from("posting_skills").delete().eq("posting_id", postingId);

  if (body.selectedSkills && body.selectedSkills.length > 0) {
    const postingSkillRows = body.selectedSkills.map((s) => ({
      posting_id: postingId,
      skill_id: s.skillId,
      level_min: s.levelMin,
    }));
    await supabase.from("posting_skills").insert(postingSkillRows);
  }

  // Sync availability_windows
  await supabase
    .from("availability_windows")
    .delete()
    .eq("posting_id", postingId);

  if (
    body.availabilityMode !== "flexible" &&
    body.availabilityWindows &&
    body.availabilityWindows.length > 0
  ) {
    const windowRows = body.availabilityWindows.map((w) => ({
      posting_id: postingId,
      window_type: "recurring" as const,
      day_of_week: w.day_of_week,
      start_minutes: w.start_minutes,
      end_minutes: w.end_minutes,
    }));
    await supabase.from("availability_windows").insert(windowRows);
  }

  return apiSuccess({ posting: updated });
});

export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // Fetch posting to verify ownership
  const { data: posting, error: fetchError } = await supabase
    .from("postings")
    .select("id, creator_id")
    .eq("id", postingId)
    .single();

  if (fetchError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    throw new AppError(
      "FORBIDDEN",
      "Not authorized to delete this posting",
      403,
    );
  }

  const { error: deleteError } = await supabase
    .from("postings")
    .delete()
    .eq("id", postingId);

  if (deleteError) {
    return apiError(
      "INTERNAL",
      `Failed to delete posting: ${deleteError.message}`,
      500,
    );
  }

  return apiSuccess({ deleted: true });
});
