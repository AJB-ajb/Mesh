import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/** POST: Submit or update a response to a proposal */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;
  const proposalId = params.proposalId;

  // Verify team membership
  const { data: isMember } = await supabase.rpc("is_posting_team_member", {
    p_posting_id: postingId,
    p_user_id: user.id,
  });

  if (!isMember) {
    return apiError("FORBIDDEN", "Not a team member", 403);
  }

  // Verify proposal exists and belongs to this posting
  const { data: proposal } = await supabase
    .from("meeting_proposals")
    .select("status")
    .eq("id", proposalId)
    .eq("posting_id", postingId)
    .single();

  if (!proposal) {
    return apiError("NOT_FOUND", "Proposal not found", 404);
  }

  if (proposal.status !== "proposed") {
    return apiError("VALIDATION", "Can only respond to proposed meetings", 400);
  }

  const body = await req.json();
  const { response } = body as { response: string };

  if (!response || !["available", "unavailable"].includes(response)) {
    return apiError(
      "VALIDATION",
      "response must be 'available' or 'unavailable'",
      400,
    );
  }

  // Upsert response (unique constraint on proposal_id + responder_id)
  const { data: responseRecord, error } = await supabase
    .from("meeting_responses")
    .upsert(
      {
        proposal_id: proposalId,
        responder_id: user.id,
        response,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "proposal_id,responder_id" },
    )
    .select()
    .single();

  if (error) {
    return apiError("INTERNAL", error.message, 500);
  }

  return NextResponse.json({ response: responseRecord });
});
