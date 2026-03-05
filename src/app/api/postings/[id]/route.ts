import { withAuth } from "@/lib/api/with-auth";
import { verifyPostingOwnership } from "@/lib/api/guards";
import { syncJoinTableRows } from "@/lib/api/sync-join-table";
import {
  validatePostingBody,
  buildPostingDbRow,
  type PostingBody,
} from "@/lib/api/postings-validation";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";

export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;
  const body = await parseBody<PostingBody>(req);

  validatePostingBody(body, "edit");

  await verifyPostingOwnership(supabase, postingId, user.id);

  const dbRow = buildPostingDbRow(body, "edit");

  const { data: updated, error: updateError } = await supabase
    .from("postings")
    .update(dbRow)
    .eq("id", postingId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to update posting: ${updateError.message}`,
      500,
    );
  }

  // Sync posting_skills
  const postingSkillRows = (body.selectedSkills ?? []).map((s) => ({
    posting_id: postingId,
    skill_id: s.skillId,
    level_min: s.levelMin,
  }));
  await syncJoinTableRows(
    supabase,
    "posting_skills",
    "posting_id",
    postingId,
    postingSkillRows,
  );

  // Sync availability_windows
  const windowRows =
    body.availabilityMode !== "flexible"
      ? (body.availabilityWindows ?? []).map((w) => ({
          posting_id: postingId,
          window_type: "recurring" as const,
          day_of_week: w.day_of_week,
          start_minutes: w.start_minutes,
          end_minutes: w.end_minutes,
        }))
      : [];
  await syncJoinTableRows(
    supabase,
    "availability_windows",
    "posting_id",
    postingId,
    windowRows,
  );

  return apiSuccess({ posting: updated });
});

export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  await verifyPostingOwnership(supabase, postingId, user.id);

  const { error: deleteError } = await supabase
    .from("postings")
    .delete()
    .eq("id", postingId);

  if (deleteError) {
    throw new AppError(
      "INTERNAL",
      `Failed to delete posting: ${deleteError.message}`,
      500,
    );
  }

  return apiSuccess({ deleted: true });
});
