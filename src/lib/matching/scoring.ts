/**
 * Match Scoring Utilities
 * Implements weighted geometric mean for combining multi-dimensional match scores
 */

import type { ScoreBreakdown } from "@/lib/supabase/types";
import { haversineDistance } from "./similarity";

/**
 * Default weights for each dimension
 * 4-dimension scoring: semantic, availability, skill_level, location
 */
export interface DimensionWeights {
  semantic: number; // 0.30 - Semantic similarity
  availability: number; // 0.30 - Availability match
  skill_level: number; // 0.20 - Skill level match
  location: number; // 0.20 - Location compatibility
}

export const DEFAULT_WEIGHTS: DimensionWeights = {
  semantic: 0.3,
  availability: 0.3,
  skill_level: 0.2,
  location: 0.2,
};

/**
 * Computes weighted geometric mean of dimension scores
 * Formula: score = Π(sᵢ^wᵢ)^(1/Σwᵢ)
 *
 * Where:
 * - sᵢ = score for dimension i (0-1)
 * - wᵢ = weight for dimension i
 *
 * Behavior:
 * - Low scores hurt multiplicatively (0.9 × 0.9 × 0.3 → 0.24)
 * - Zero in any weighted dimension → zero overall
 *
 * @param breakdown Per-dimension scores
 * @param weights Dimension weights (defaults to DEFAULT_WEIGHTS)
 * @returns Combined score (0-1)
 */
export function computeWeightedScore(
  breakdown: ScoreBreakdown,
  weights: DimensionWeights = DEFAULT_WEIGHTS,
): number {
  const dimensions: (keyof ScoreBreakdown)[] = [
    "semantic",
    "availability",
    "skill_level",
    "location",
  ];

  // Calculate product of (score^weight) for each dimension
  let product = 1.0;
  let totalWeight = 0.0;

  for (const dimension of dimensions) {
    const score = breakdown[dimension];
    const weight = weights[dimension];

    // Skip zero-weight dimensions or undefined scores
    if (weight <= 0 || score === undefined) continue;

    // If score is 0, return 0 (multiplicative property)
    if (score <= 0) {
      return 0.0;
    }

    // Add to product: score^weight
    product *= Math.pow(score, weight);
    totalWeight += weight;
  }

  // If no weights, return average
  if (totalWeight === 0) {
    const scores = dimensions
      .map((d) => breakdown[d])
      .filter((s) => s !== undefined);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Return geometric mean: (product)^(1/totalWeight)
  return Math.pow(product, 1 / totalWeight);
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
