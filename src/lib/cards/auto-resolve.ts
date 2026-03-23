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

export interface AutoResolveResult {
  shouldResolve: boolean;
  resolvedData?: Record<string, unknown>;
}

/**
 * Check if a card should auto-resolve based on voting state.
 *
 * Rules:
 * - **Time Proposal**: resolves when ALL effective members have responded
 *   (voted or opted out). "Pass" opt-outs reduce effective member count.
 *   Ties go to first-listed option. Quorum required if set.
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
    case "time_proposal": {
      const optOuts = (card.opt_outs ?? []) as Array<{
        user_id: string;
        reason: string;
      }>;
      const quorum = (data.quorum as number) ?? null;
      return checkTimeProposal(options, memberCount, optOuts, quorum);
    }
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
  optOuts: Array<{ user_id: string; reason: string }> = [],
  quorum: number | null = null,
): AutoResolveResult {
  if (options.length === 0 || memberCount === 0) {
    return { shouldResolve: false };
  }

  // "Pass" opt-outs don't count toward required voters
  const passCount = optOuts.filter((o) => o.reason === "pass").length;
  const effectiveMemberCount = memberCount - passCount;

  // Collect all unique voters across all options
  const allVoters = new Set<string>();
  for (const opt of options) {
    for (const v of opt.votes) allVoters.add(v);
  }

  // "Can't make any" opt-outs count as having responded
  const cantMakeCount = optOuts.filter(
    (o) => o.reason === "cant_make_any",
  ).length;
  const totalResponded = allVoters.size + cantMakeCount;

  // All effective members must have responded
  if (totalResponded < effectiveMemberCount) {
    return { shouldResolve: false };
  }

  // Find max vote count — ties go to first-listed option
  const maxVotes = Math.max(...options.map((o) => o.votes.length), 0);
  if (maxVotes === 0) return { shouldResolve: false };

  // Quorum check: winning option must have enough votes
  if (quorum != null && maxVotes < quorum) {
    return { shouldResolve: false };
  }

  // First option with max votes wins (tie-break: first-listed)
  const winner = options.find((o) => o.votes.length === maxVotes)!;

  return {
    shouldResolve: true,
    resolvedData: { resolved_slot: winner.label },
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
