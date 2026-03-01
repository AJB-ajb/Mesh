import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";
import { getUserTier, canAccessFeature } from "@/lib/tier";
import { generateMatchExplanation } from "@/lib/matching/explanation";
import { isGeminiConfigured } from "@/lib/ai/gemini";

/**
 * POST /api/matches/[id]/explain
 * Generate or return cached explanation for a match.
 * Requires premium tier.
 */
export const POST = withAuth(async (_req, { user, supabase, params }) => {
  const matchId = params.id;

  // Fetch the match and verify ownership
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, posting_id, user_id, similarity_score, explanation, score_breakdown",
    )
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return apiError("NOT_FOUND", "Match not found", 404);
  }

  // Verify the user owns this match (either as candidate or posting creator)
  const { data: posting } = await supabase
    .from("postings")
    .select("creator_id, title, description")
    .eq("id", match.posting_id)
    .single();

  if (match.user_id !== user.id && posting?.creator_id !== user.id) {
    return apiError("FORBIDDEN", "You do not have access to this match", 403);
  }

  // Check tier
  const tier = await getUserTier(user.id);
  if (!canAccessFeature(tier, "onDemandExplanation")) {
    return apiError(
      "FORBIDDEN",
      "Upgrade to premium to access match explanations",
      403,
    );
  }

  // Return cached explanation if available
  if (match.explanation) {
    return apiSuccess({ explanation: match.explanation, cached: true });
  }

  // Check if Gemini is configured
  if (!isGeminiConfigured()) {
    return apiError("INTERNAL", "AI explanation service is not available", 503);
  }

  // Fetch profile data for explanation generation
  const { data: profile } = await supabase
    .from("profiles")
    .select("bio, interests, location_preference")
    .eq("user_id", match.user_id)
    .single();

  if (!profile || !posting) {
    return apiError("INTERNAL", "Could not load match data", 500);
  }

  // Fetch posting skills from join table
  const { data: postingSkills } = await supabase
    .from("posting_skills")
    .select("skill_nodes(name)")
    .eq("posting_id", match.posting_id);

  const skills = (postingSkills ?? [])
    .map((ps: Record<string, unknown>) => {
      const node = ps.skill_nodes as { name: string } | null;
      return node?.name;
    })
    .filter(Boolean) as string[];

  // Generate explanation
  const explanation = await generateMatchExplanation(
    {
      bio: profile.bio,
      interests: profile.interests,
      location_preference: profile.location_preference,
    },
    {
      title: posting.title,
      description: posting.description,
      skills,
      category: null,
      estimated_time: null,
    },
    match.similarity_score,
  );

  // Cache in database
  await supabase.from("matches").update({ explanation }).eq("id", matchId);

  return apiSuccess({ explanation, cached: false });
});
