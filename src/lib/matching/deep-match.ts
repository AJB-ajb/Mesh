/**
 * LLM-powered deep matching using Gemini structured output.
 * Evaluates candidate-posting fit beyond fast-filter similarity.
 */

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
      postingText: input.postingText,
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
 * Batch evaluates multiple candidates against a posting.
 * Uses concurrency limit to avoid rate limits.
 */
export async function deepMatchCandidates(
  postingTitle: string,
  postingText: string,
  candidates: Array<{
    profileText: string;
    fastFilterScore: number;
    sharedSkills: string[];
    availabilityOverlap: number | null;
    distanceKm: number | null;
    semanticScore: number | null;
  }>,
  options?: { concurrency?: number },
): Promise<DeepMatchResult[]> {
  const concurrency = options?.concurrency ?? DEEP_MATCH.DEFAULT_CONCURRENCY;
  const results: DeepMatchResult[] = [];

  // Process in batches to respect concurrency limit
  let i = 0;
  while (i < candidates.length) {
    const batch = candidates.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((candidate) =>
        deepMatchCandidate({
          postingTitle,
          postingText,
          profileText: candidate.profileText,
          fastFilterScore: candidate.fastFilterScore,
          sharedSkills: candidate.sharedSkills,
          availabilityOverlap: candidate.availabilityOverlap,
          distanceKm: candidate.distanceKm,
          semanticScore: candidate.semanticScore,
        }).catch((error) => {
          console.error("Deep match failed for candidate:", error);
          return null;
        }),
      ),
    );
    results.push(
      ...batchResults.filter((r): r is DeepMatchResult => r !== null),
    );
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
