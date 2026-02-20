import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, parseBody } from "@/lib/errors";
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
    return apiError("FORBIDDEN", "Not a team member", 403);
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
    return apiError("INTERNAL", error.message, 500);
  }

  return NextResponse.json({ proposals: proposals ?? [] });
});

/** POST: Create a new meeting proposal (owner only) */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;

  // Check if user is posting owner
  const { data: posting } = await supabase
    .from("postings")
    .select("creator_id")
    .eq("id", postingId)
    .single();

  if (!posting || posting.creator_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "Only the posting owner can propose meetings",
      403,
    );
  }

  const { title, startTime, endTime } = await parseBody<{
    title?: string;
    startTime: string;
    endTime: string;
  }>(req);

  if (!startTime || !endTime) {
    return apiError("VALIDATION", "startTime and endTime are required", 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return apiError("VALIDATION", "Invalid date format", 400);
  }

  if (end <= start) {
    return apiError("VALIDATION", "endTime must be after startTime", 400);
  }

  // Check proposal count limit
  const { count } = await supabase
    .from("meeting_proposals")
    .select("id", { count: "exact", head: true })
    .eq("posting_id", postingId)
    .in("status", ["proposed", "confirmed"]);

  if ((count ?? 0) >= SCHEDULING.MAX_PROPOSALS_PER_POSTING) {
    return apiError(
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
    return apiError("INTERNAL", error.message, 500);
  }

  return NextResponse.json({ proposal }, { status: 201 });
});
