import { withAuth } from "@/lib/api/with-auth";
import { verifyPostingOwnership } from "@/lib/api/ownership";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { SCHEDULING } from "@/lib/constants";

/** GET: List proposals with responses for a posting */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // Verify team membership
  const { data: isMember } = await supabase.rpc("is_posting_team_member", {
    p_posting_id: postingId,
    p_user_id: user.id,
  });

  if (!isMember) {
    throw new AppError("FORBIDDEN", "Not a team member", 403);
  }

  const { data: proposals, error } = await supabase
    .from("meeting_proposals")
    .select(
      `*,
      responses:meeting_responses(
        id, proposal_id, responder_id, response, created_at, updated_at,
        profiles(full_name)
      )`,
    )
    .eq("posting_id", postingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", error.message, 500);
  }

  return apiSuccess({ proposals: proposals ?? [] });
});

/** POST: Create a new meeting proposal (owner only) */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;

  // Verify user is posting owner
  await verifyPostingOwnership(supabase, postingId, user.id);

  const { title, startTime, endTime } = await parseBody<{
    title?: string;
    startTime: string;
    endTime: string;
  }>(req);

  if (!startTime || !endTime) {
    throw new AppError("VALIDATION", "startTime and endTime are required", 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("VALIDATION", "Invalid date format", 400);
  }

  if (end <= start) {
    throw new AppError("VALIDATION", "endTime must be after startTime", 400);
  }

  // Check proposal count limit
  const { count } = await supabase
    .from("meeting_proposals")
    .select("id", { count: "exact", head: true })
    .eq("posting_id", postingId)
    .in("status", ["proposed", "confirmed"]);

  if ((count ?? 0) >= SCHEDULING.MAX_PROPOSALS_PER_POSTING) {
    throw new AppError(
      "VALIDATION",
      `Maximum of ${SCHEDULING.MAX_PROPOSALS_PER_POSTING} active proposals per posting`,
      400,
    );
  }

  const { data: proposal, error } = await supabase
    .from("meeting_proposals")
    .insert({
      posting_id: postingId,
      proposed_by: user.id,
      title: title || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new AppError("INTERNAL", error.message, 500);
  }

  return apiSuccess({ proposal }, 201);
});
