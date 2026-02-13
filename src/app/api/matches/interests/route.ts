import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess } from "@/lib/errors";

/**
 * GET /api/matches/interests
 * Returns the user's expressed interests and interests received on their postings.
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  // Fetch interests I've expressed (postings I'm interested in)
  const { data: myInterests } = await supabase
    .from("matches")
    .select(
      `
      id,
      posting_id,
      similarity_score,
      status,
      created_at,
      postings:posting_id (
        id,
        title,
        description,
        skills,
        category,
        mode,
        status,
        creator_id,
        created_at,
        profiles:creator_id (
          full_name,
          user_id
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "interested")
    .order("created_at", { ascending: false });

  // Fetch interests received on my postings
  const { data: myPostings } = await supabase
    .from("postings")
    .select("id")
    .eq("creator_id", user.id);

  const myPostingIds = (myPostings || []).map((p) => p.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let interestsReceived: any[] = [];
  if (myPostingIds.length > 0) {
    const { data } = await supabase
      .from("matches")
      .select(
        `
        id,
        posting_id,
        user_id,
        similarity_score,
        status,
        created_at,
        postings:posting_id (
          id,
          title,
          description,
          skills,
          category,
          mode,
          status,
          creator_id,
          created_at
        ),
        profiles:user_id (
          full_name,
          user_id,
          headline,
          skills
        )
      `,
      )
      .in("posting_id", myPostingIds)
      .eq("status", "interested")
      .order("created_at", { ascending: false });

    interestsReceived = data || [];
  }

  return apiSuccess({
    myInterests: myInterests || [],
    interestsReceived: interestsReceived || [],
  });
});
