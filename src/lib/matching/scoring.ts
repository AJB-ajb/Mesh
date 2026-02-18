/**
 * Match Scoring Utilities
 * Implements weighted arithmetic mean for combining multi-dimensional match scores
 * Spec: spec/matching.md:156 — score = Σ(sᵢ × wᵢ) / Σwᵢ
 */

import type { ScoreBreakdown } from "@/lib/supabase/types";
import { haversineDistance } from "./similarity";

/**
 * Default weights for each dimension
 * 4-dimension scoring: semantic, availability, skill_level, location
 * Per spec/matching.md the ratio matters since we normalize
 */
export interface DimensionWeights {
  semantic: number;
  availability: number;
  skill_level: number;
  location: number;
}

export const DEFAULT_WEIGHTS: DimensionWeights = {
  semantic: 1.0,
  availability: 1.0,
  skill_level: 0.7,
  location: 0.7,
};

/** Minimum match score threshold — matches below this are filtered out */
export const MATCH_SCORE_THRESHOLD = 0.05;

const DIMENSIONS: (keyof ScoreBreakdown)[] = [
  "semantic",
  "availability",
  "skill_level",
  "location",
];

/**
 * Computes weighted arithmetic mean of dimension scores
 * Formula: score = Σ(sᵢ × wᵢ) / Σwᵢ
 *
 * Null dimensions are skipped (excluded from both numerator and denominator).
 * This prevents missing data (e.g. no embeddings) from zeroing the entire score.
 *
 * @param breakdown Per-dimension scores (null = data missing, skip)
 * @param weights Dimension weights (defaults to DEFAULT_WEIGHTS)
 * @returns Combined score (0-1), or 0 if no valid dimensions
 */
export function computeWeightedScore(
  breakdown: ScoreBreakdown,
  weights: DimensionWeights = DEFAULT_WEIGHTS,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dimension of DIMENSIONS) {
    const score = breakdown[dimension];
    const weight = weights[dimension];

    // Skip null/undefined dimensions or zero-weight dimensions
    if (score == null || weight <= 0) continue;

    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return weightedSum / totalWeight;
}

/**
 * Normalizes weights so they sum to 1
 * Useful for ensuring consistent scaling
 */
export function normalizeWeights(weights: DimensionWeights): DimensionWeights {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;

  return {
    semantic: weights.semantic / total,
    availability: weights.availability / total,
    skill_level: weights.skill_level / total,
    location: weights.location / total,
  };
}

/**
 * Calculates distance between two profiles/locations
 */
export function calculateDistance(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null,
): number | null {
  return haversineDistance(lat1, lng1, lat2, lng2);
}

/**
 * Formats a score (0-1) as a percentage string
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Gets a color variant for a score based on thresholds
 * - >= 0.7: success (green)
 * - >= 0.5: warning (yellow)
 * - < 0.5: destructive (red)
 */
export function getScoreColorVariant(
  score: number,
): "success" | "warning" | "destructive" {
  if (score >= 0.7) return "success";
  if (score >= 0.5) return "warning";
  return "destructive";
}
