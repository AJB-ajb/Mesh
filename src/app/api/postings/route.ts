import { withAuth } from "@/lib/api/with-auth";
import { ensureProfileExists } from "@/lib/api/guards";
import { syncJoinTableRows } from "@/lib/api/sync-join-table";
import {
  validatePostingBody,
  buildPostingDbRow,
  type PostingBody,
} from "@/lib/api/postings-validation";
import { triggerEmbeddingGenerationServer } from "@/lib/api/trigger-embedding-server";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await parseBody<PostingBody>(req);

  validatePostingBody(body, "create");

  // Auto-generate title from description if not provided
  const title =
    (body.title ?? "").trim() ||
    (body.description ?? "").trim().split(/[.\n]/)[0].slice(0, 100) ||
    "Untitled Posting";

  // Ensure user has a profile (required for creator_id FK)
  await ensureProfileExists(supabase, user);

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
      throw new AppError(
        "VALIDATION",
        "Your profile is missing. Please complete your profile first.",
        400,
      );
    }
    if (insertError.code === "23505") {
      throw new AppError(
        "CONFLICT",
        "A posting with this information already exists.",
        409,
      );
    }
    if (insertError.code === "23514") {
      throw new AppError(
        "VALIDATION",
        `Invalid posting data: ${insertError.message}`,
        400,
      );
    }
    throw new AppError(
      "INTERNAL",
      `Failed to create posting: ${insertError.message || "Please try again."}`,
      500,
    );
  }

  // Sync posting_skills
  const postingSkillRows = (body.selectedSkills ?? []).map((s) => ({
    posting_id: posting.id,
    skill_id: s.skillId,
    level_min: s.levelMin,
  }));
  await syncJoinTableRows(
    supabase,
    "posting_skills",
    "posting_id",
    posting.id,
    postingSkillRows,
  );

  // Sync availability_windows
  const windowRows =
    body.availabilityMode !== "flexible"
      ? (body.availabilityWindows ?? []).map((w) => ({
          posting_id: posting.id,
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
    posting.id,
    windowRows,
  );

  // Trigger embedding generation (fire-and-forget)
  triggerEmbeddingGenerationServer().catch(() => {});

  return apiSuccess({ posting }, 201);
});
