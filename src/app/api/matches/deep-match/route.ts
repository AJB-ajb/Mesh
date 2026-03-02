/**
 * POST /api/matches/deep-match
 *
 * Premium endpoint: runs an in-depth matching pass for the authenticated user.
 * Gated to pro-tier users and rate-limited to 5 requests per hour per user.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";
import { createRateLimiter } from "@/lib/api/rate-limit";
import { getUserTier, canAccessFeature } from "@/lib/api/tiers";
import {
  matchProfileToPostings,
  createMatchRecords,
} from "@/lib/matching/profile-to-posting";
import type { MatchResponse } from "@/lib/supabase/types";

/** Module-level limiter — lives for the lifetime of the server process. */
const limiter = createRateLimiter("deep-match", {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

export const POST = withAuth(async (_req, { user, supabase }) => {
  // --- Tier gate ---
  const tier = await getUserTier(user.id);
  if (!canAccessFeature(tier, "deepMatchCandidates")) {
    return apiError(
      "FORBIDDEN",
      "Deep match is available on the Pro plan. Upgrade to unlock.",
      403,
    );
  }

  // --- Rate limit ---
  const { allowed, retryAfter } = limiter.check(user.id);
  if (!allowed) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Rate limit exceeded. Try again later.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  // --- Check profile exists ---
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("bio, headline")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return apiError(
      "VALIDATION",
      "Profile not found. Please complete your profile first.",
      400,
    );
  }

  if (!profile.bio && !profile.headline) {
    return apiError(
      "VALIDATION",
      "Please add a bio or headline to your profile to find matches.",
      400,
    );
  }

  // --- Run deep matching ---
  const matches = await matchProfileToPostings(user.id, 20);

  if (matches.length > 0) {
    await createMatchRecords(user.id, matches);
  }

  const response: MatchResponse[] = matches.map((match) => ({
    id: match.matchId || "",
    posting: match.posting,
    score: match.score,
    explanation: null,
    score_breakdown: match.scoreBreakdown,
    status: "pending",
    created_at: match.posting.created_at,
  }));

  return apiSuccess({ matches: response });
});
