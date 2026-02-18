import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";

/**
 * GET /api/skills/descendants?skill_id=uuid
 * Returns all descendant skill IDs for a given skill node (inclusive).
 * Used by the browse page to resolve tree-aware skill filters.
 */
export const GET = withAuth(async (req, { supabase }) => {
  const { searchParams } = new URL(req.url);
  const skillId = searchParams.get("skill_id");

  if (!skillId) {
    return NextResponse.json(
      { error: "skill_id parameter is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("get_skill_descendants", {
    root_skill_id: skillId,
  });

  if (error) {
    return NextResponse.json(
      { error: `Failed to get descendants: ${error.message}` },
      { status: 500 },
    );
  }

  const descendantIds = (data || []).map((row: { id: string }) => row.id);

  return NextResponse.json({ descendantIds });
});
