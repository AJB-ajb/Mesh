import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

export const GET = withAuth(async (_req, { supabase, params }) => {
  const postingId = params.id;

  // Get team member IDs
  const { data: memberIds, error: memberError } = await supabase.rpc(
    "get_posting_team_member_ids",
    { p_posting_id: postingId },
  );

  if (memberError || !memberIds || memberIds.length === 0) {
    return apiError("NOT_FOUND", "Posting or team not found", 404);
  }

  // Get common availability windows
  const { data: windows, error: windowError } = await supabase.rpc(
    "get_team_common_availability",
    { p_profile_ids: memberIds },
  );

  if (windowError) {
    return apiError("INTERNAL", windowError.message, 500);
  }

  return NextResponse.json({ windows: windows ?? [] });
});
