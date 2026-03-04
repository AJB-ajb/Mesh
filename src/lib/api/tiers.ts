/**
 * User tier system.
 *
 * Pre-launch stub — currently all users are "free" until a billing
 * integration is added. The feature gate is wired up now so that
 * the deep-match endpoint (and future premium features) can be
 * unlocked by simply changing `getUserTier` to read from the DB.
 */

export type UserTier = "free" | "pro";

/** Features that can be gated by tier. */
export type GatedFeature = "deepMatchCandidates";

const FEATURE_ACCESS: Record<GatedFeature, UserTier[]> = {
  deepMatchCandidates: ["pro"],
};

/**
 * Resolve the tier for a given user.
 * TODO: read from a `subscriptions` table once billing is live.
 */
export async function getUserTier(_userId: string): Promise<UserTier> {
  // For now every user is treated as "pro" (pre-launch, no paywall).
  // Flip to "free" and wire up DB lookup when billing ships.
  return "pro";
}

/**
 * Check whether a tier has access to a given feature.
 */
export function canAccessFeature(
  tier: UserTier,
  feature: GatedFeature,
): boolean {
  return FEATURE_ACCESS[feature].includes(tier);
}
