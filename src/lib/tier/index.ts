/**
 * User tier (free/premium) feature gating.
 */

import { createClient } from "@/lib/supabase/server";

export type UserTier = "free" | "premium";

export type TierFeature =
  | "deepMatchExplanation"
  | "onDemandExplanation"
  | "deepMatchCandidates";

export const TIER_FEATURES: Record<
  TierFeature,
  { free: boolean; premium: boolean }
> = {
  deepMatchExplanation: { free: false, premium: true },
  onDemandExplanation: { free: false, premium: true },
  deepMatchCandidates: { free: false, premium: true },
} as const;

/** Max deep-match candidates per tier */
export const TIER_LIMITS = {
  free: { deepMatchCandidates: 0 },
  premium: { deepMatchCandidates: 10 },
} as const;

/**
 * Returns the tier for a given user ID.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("tier")
    .eq("user_id", userId)
    .single();

  return (data?.tier as UserTier) ?? "free";
}

/**
 * Checks if a tier has access to a specific feature.
 */
export function canAccessFeature(
  tier: UserTier,
  feature: TierFeature,
): boolean {
  return TIER_FEATURES[feature]?.[tier] ?? false;
}
