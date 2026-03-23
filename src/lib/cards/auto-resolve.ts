/**
 * Auto-resolve logic for space cards.
 *
 * Pure function — given a card and the space's member count,
 * determines whether the card should be automatically resolved.
 */

import type {
  SpaceCard,
  SpaceCardType,
  CardOption,
} from "@/lib/supabase/types";

interface AutoResolveResult {
  shouldResolve: boolean;
  resolvedData?: Record<string, unknown>;
}

/**
 * Check if a card should auto-resolve based on voting state.
 *
 * Rules:
 * - **Time Proposal**: resolves when ALL members have voted (appear in at
 *   least one option) AND there's a clear winner (no tie for max votes).
 * - **RSVP**: resolves when "Yes" votes >= threshold.
 * - **Task Claim**: resolves when someone claims (option 0 has >= 1 vote).
 * - **Poll / Location**: never auto-resolve (informational / creator decides).
 */
export function checkAutoResolve(
  card: SpaceCard,
  memberCount: number,
): AutoResolveResult {
  if (card.status !== "active") {
    return { shouldResolve: false };
  }

  const data = card.data as unknown as Record<string, unknown>;
  const options = (data.options ?? []) as CardOption[];

  switch (card.type as SpaceCardType) {
    case "time_proposal":
      return checkTimeProposal(options, memberCount);
    case "rsvp":
      return checkRsvp(options, (data.threshold as number) ?? 1);
    case "task_claim":
      return checkTaskClaim(options);
    case "poll":
    case "location":
    default:
      return { shouldResolve: false };
  }
}

function checkTimeProposal(
  options: CardOption[],
  memberCount: number,
): AutoResolveResult {
  if (options.length === 0 || memberCount === 0) {
    return { shouldResolve: false };
  }

  // Collect all unique voters across all options
  const allVoters = new Set<string>();
  for (const opt of options) {
    for (const v of opt.votes) allVoters.add(v);
  }

  // All members must have voted
  if (allVoters.size < memberCount) {
    return { shouldResolve: false };
  }

  // Find max vote count and check for ties
  const sorted = [...options].sort((a, b) => b.votes.length - a.votes.length);
  const maxVotes = sorted[0].votes.length;

  if (maxVotes === 0) return { shouldResolve: false };

  const tiedOptions = sorted.filter((o) => o.votes.length === maxVotes);
  if (tiedOptions.length > 1) {
    return { shouldResolve: false }; // Tie — don't auto-resolve
  }

  return {
    shouldResolve: true,
    resolvedData: { resolved_slot: sorted[0].label },
  };
}

function checkRsvp(
  options: CardOption[],
  threshold: number,
): AutoResolveResult {
  const yesOption = options.find((o) => o.label.toLowerCase() === "yes");
  if (!yesOption) return { shouldResolve: false };

  if (yesOption.votes.length >= threshold) {
    return { shouldResolve: true };
  }

  return { shouldResolve: false };
}

function checkTaskClaim(options: CardOption[]): AutoResolveResult {
  if (options.length === 0) return { shouldResolve: false };

  const claimOption = options[0];
  if (claimOption.votes.length >= 1) {
    return {
      shouldResolve: true,
      resolvedData: { claimed_by: claimOption.votes[0] },
    };
  }

  return { shouldResolve: false };
}
