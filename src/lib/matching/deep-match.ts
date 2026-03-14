/**
 * LLM-powered deep matching using Gemini structured output.
 * Evaluates candidate-posting fit beyond fast-filter similarity.
 */

import * as Sentry from "@sentry/nextjs";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";
import {
  DEEP_MATCH_SYSTEM_PROMPT,
  deepMatchResponseSchema,
  buildDeepMatchUserPrompt,
} from "@/lib/ai/deep-match-prompt";
import { DEEP_MATCH } from "@/lib/constants";

export interface DeepMatchInput {
  postingTitle: string;
  postingText: string;
  profileText: string;
  parentStateText?: string;
  fastFilterScore: number;
  sharedSkills: string[];
  availabilityOverlap: number | null;
  distanceKm: number | null;
  semanticScore: number | null;
}

export interface DeepMatchResult {
  score: number;
  explanation: string;
  concerns: string;
  matchedRole: string;
  identifiedRoles: string[];
}

/**
 * Evaluates a single candidate against a posting using Gemini.
 */
export async function deepMatchCandidate(
  input: DeepMatchInput,
): Promise<DeepMatchResult> {
  const fastFilterSummary = [
    `Fast-filter score: ${Math.round(input.fastFilterScore * 100)}%`,
    input.sharedSkills.length > 0
      ? `Shared skills: ${input.sharedSkills.join(", ")}`
      : "No shared skills detected",
    input.availabilityOverlap != null
      ? `Availability overlap: ${Math.round(input.availabilityOverlap * 100)}%`
      : "Availability: not compared",
    input.distanceKm != null
      ? `Distance: ${Math.round(input.distanceKm)} km`
      : "Distance: unknown",
    input.semanticScore != null
      ? `Semantic similarity: ${Math.round(input.semanticScore * 100)}%`
      : "Semantic: not available",
  ].join("\n");

  // Include parent space context when available
  const effectivePostingText = input.parentStateText
    ? `[Space context: ${input.parentStateText}]\n\n${input.postingText}`
    : input.postingText;

  const result = await generateStructuredJSON<{
    identified_roles: string[];
    matched_role: string;
    score: number;
    explanation: string;
    concerns: string;
  }>({
    systemPrompt: DEEP_MATCH_SYSTEM_PROMPT,
    userPrompt: buildDeepMatchUserPrompt({
      postingTitle: input.postingTitle,
      postingText: effectivePostingText,
      profileText: input.profileText,
      fastFilterSummary,
    }),
    schema: deepMatchResponseSchema(),
    temperature: 0.3,
  });

  return {
    score: Math.max(0, Math.min(1, result.score)),
    explanation: result.explanation,
    concerns: result.concerns,
    matchedRole: result.matched_role,
    identifiedRoles: result.identified_roles,
  };
}

/**
 * Candidate input for deep matching — shared shape used by both directions.
 *
 * For posting-to-profile matching the batch-level postingTitle/postingText
 * applies to every candidate.  For profile-to-posting matching each candidate
 * represents a *different* posting, so `postingTitle` and `postingText` can be
 * set per-candidate to override the batch-level values.
 */
export interface DeepMatchCandidate {
  profileText: string;
  parentStateText?: string;
  fastFilterScore: number;
  sharedSkills: string[];
  availabilityOverlap: number | null;
  distanceKm: number | null;
  semanticScore: number | null;
  /** Override the batch-level posting title for this candidate. */
  postingTitle?: string;
  /** Override the batch-level posting text for this candidate. */
  postingText?: string;
}

/**
 * Batch evaluates multiple candidates against a posting.
 * Uses concurrency limit to avoid rate limits.
 *
 * Returns an array with the same length as `candidates`.
 * Failed LLM calls produce `null` at the corresponding index,
 * preserving the 1:1 positional correspondence.
 */
export async function deepMatchCandidates(
  postingTitle: string,
  postingText: string,
  candidates: DeepMatchCandidate[],
  options?: { concurrency?: number },
): Promise<(DeepMatchResult | null)[]> {
  const concurrency = options?.concurrency ?? DEEP_MATCH.DEFAULT_CONCURRENCY;
  const results: (DeepMatchResult | null)[] = [];

  // Process in batches to respect concurrency limit
  let i = 0;
  while (i < candidates.length) {
    const batch = candidates.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((candidate) =>
        deepMatchCandidate({
          postingTitle: candidate.postingTitle ?? postingTitle,
          postingText: candidate.postingText ?? postingText,
          profileText: candidate.profileText,
          parentStateText: candidate.parentStateText,
          fastFilterScore: candidate.fastFilterScore,
          sharedSkills: candidate.sharedSkills,
          availabilityOverlap: candidate.availabilityOverlap,
          distanceKm: candidate.distanceKm,
          semanticScore: candidate.semanticScore,
        }).catch((error) => {
          Sentry.captureException(error, { tags: { source: "deep-match" } });
          return null;
        }),
      ),
    );
    results.push(...batchResults);
    i += concurrency;
  }

  return results;
}

/**
 * Blends fast-filter and deep-match scores.
 * Returns the fast-filter score if deep match is unavailable.
 */
export function blendScores(
  fastFilterScore: number,
  deepMatchScore: number | null,
): number {
  if (deepMatchScore == null) return fastFilterScore;
  return (
    DEEP_MATCH.FAST_FILTER_WEIGHT * fastFilterScore +
    DEEP_MATCH.DEEP_MATCH_WEIGHT * deepMatchScore
  );
}

/**
 * Checks whether deep matching is available (Gemini configured).
 */
export function isDeepMatchAvailable(): boolean {
  return isGeminiConfigured();
}

// ---------------------------------------------------------------------------
// Shared deep-match application helper
// ---------------------------------------------------------------------------

/**
 * Runs deep matching on `topN` match entries, blends scores in-place,
 * and re-sorts the full `allMatches` array.
 *
 * `buildCandidate` maps each entry to the LLM candidate input.
 * Return `null` to skip an entry (e.g. missing text).
 *
 * Because entries are mutated by reference, the caller's original
 * match objects are updated directly — no wrapper objects needed.
 */
export async function applyDeepMatchResults<
  M extends { score: number; deepMatchResult?: DeepMatchResult },
>(opts: {
  topN: M[];
  allMatches: M[];
  postingTitle: string;
  postingText: string;
  buildCandidate: (entry: M) => DeepMatchCandidate | null;
}): Promise<void> {
  const { topN, allMatches, postingTitle, postingText, buildCandidate } = opts;

  // Build candidates, tracking which topN index each one came from
  const indexed: { idx: number; candidate: DeepMatchCandidate }[] = [];
  for (let i = 0; i < topN.length; i++) {
    const c = buildCandidate(topN[i]);
    if (c) indexed.push({ idx: i, candidate: c });
  }

  if (indexed.length === 0) return;

  const deepResults = await deepMatchCandidates(
    postingTitle,
    postingText,
    indexed.map((x) => x.candidate),
  );

  // Attach results back — deepResults[j] corresponds to indexed[j]
  for (let j = 0; j < indexed.length; j++) {
    const dr = deepResults[j];
    if (dr) {
      const entry = topN[indexed[j].idx];
      entry.deepMatchResult = dr;
      entry.score = blendScores(entry.score, dr.score);
    }
  }

  // Re-sort by blended score
  allMatches.sort((a, b) => b.score - a.score);
}
