import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError } from "@/lib/errors";

export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // Verify parent posting exists
  const { data: parent, error: parentError } = await supabase
    .from("postings")
    .select("id, creator_id")
    .eq("id", postingId)
    .single();

  if (parentError || !parent) {
    throw new AppError("NOT_FOUND", "Posting not found.", 404);
  }

  // Check if user is a context member (creator or accepted applicant)
  if (parent.creator_id !== user.id) {
    const { data: membership } = await supabase
      .from("applications")
      .select("id")
      .eq("posting_id", parent.id)
      .eq("applicant_id", user.id)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      throw new AppError(
        "FORBIDDEN",
        "You must be a member of this posting to view its children.",
        403,
      );
    }
  }

  const { data: children, error: childrenError } = await supabase
    .from("postings")
    .select(
      `
      *,
      profiles:creator_id (
        full_name,
        user_id
      )
    `,
    )
    .eq("parent_posting_id", postingId)
    .order("created_at", { ascending: false });

  if (childrenError) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch children: ${childrenError.message}`,
      500,
    );
  }

  return apiSuccess({ children: children ?? [] });
});
