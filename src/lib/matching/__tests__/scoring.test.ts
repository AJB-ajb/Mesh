import { describe, it, expect } from "vitest";
import {
  computeWeightedScore,
  DEFAULT_WEIGHTS,
  MATCH_SCORE_THRESHOLD,
  normalizeWeights,
  formatScore,
  getScoreColorVariant,
} from "../scoring";
import type { ScoreBreakdown } from "@/lib/supabase/types";

describe("computeWeightedScore", () => {
  it("returns weighted arithmetic mean for all non-null dimensions", () => {
    const breakdown: ScoreBreakdown = {
      semantic: 0.8,
      availability: 0.6,
      skill_level: 0.9,
      location: 0.7,
    };
    // (0.8*1.0 + 0.6*1.0 + 0.9*0.7 + 0.7*0.7) / (1.0 + 1.0 + 0.7 + 0.7)
    // = (0.8 + 0.6 + 0.63 + 0.49) / 3.4
    // = 2.52 / 3.4
    // ≈ 0.7412
    const score = computeWeightedScore(breakdown);
    expect(score).toBeCloseTo(0.7412, 3);
  });

  it("skips null dimensions and adjusts denominator", () => {
    const breakdown: ScoreBreakdown = {
      semantic: null,
      availability: 0.8,
      skill_level: 0.6,
      location: null,
    };
    // Only availability (w=1.0) and skill_level (w=0.7) contribute
    // = (0.8*1.0 + 0.6*0.7) / (1.0 + 0.7)
    // = (0.8 + 0.42) / 1.7
    // = 1.22 / 1.7
    // ≈ 0.7176
    const score = computeWeightedScore(breakdown);
    expect(score).toBeCloseTo(0.7176, 3);
  });

  it("returns non-zero when semantic is null (the 0% bug fix)", () => {
    const breakdown: ScoreBreakdown = {
      semantic: null, // embeddings missing
      availability: 1.0,
      skill_level: null, // no skill data
      location: null, // no location data
    };
    // Only availability contributes: 1.0 * 1.0 / 1.0 = 1.0
    const score = computeWeightedScore(breakdown);
    expect(score).toBe(1.0);
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 when all dimensions are null", () => {
    const breakdown: ScoreBreakdown = {
      semantic: null,
      availability: null,
      skill_level: null,
      location: null,
    };
    expect(computeWeightedScore(breakdown)).toBe(0);
  });

  it("handles zero scores without zeroing the entire result", () => {
    const breakdown: ScoreBreakdown = {
      semantic: 0, // legitimately zero
      availability: 0.8,
      skill_level: 0.6,
      location: 0.7,
    };
    // Arithmetic mean: (0*1.0 + 0.8*1.0 + 0.6*0.7 + 0.7*0.7) / 3.4
    // = (0 + 0.8 + 0.42 + 0.49) / 3.4 = 1.71 / 3.4 ≈ 0.5029
    const score = computeWeightedScore(breakdown);
    expect(score).toBeCloseTo(0.5029, 3);
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 when all non-null scores are zero", () => {
    const breakdown: ScoreBreakdown = {
      semantic: 0,
      availability: 0,
      skill_level: 0,
      location: 0,
    };
    expect(computeWeightedScore(breakdown)).toBe(0);
  });

  it("returns 1 when all non-null scores are 1", () => {
    const breakdown: ScoreBreakdown = {
      semantic: 1.0,
      availability: 1.0,
      skill_level: 1.0,
      location: 1.0,
    };
    expect(computeWeightedScore(breakdown)).toBe(1.0);
  });

  it("respects custom weights", () => {
    const breakdown: ScoreBreakdown = {
      semantic: 1.0,
      availability: 0.0,
      skill_level: 1.0,
      location: 1.0,
    };
    // With semantic weight = 0, skip it
    const weights = {
      semantic: 0,
      availability: 1.0,
      skill_level: 1.0,
      location: 1.0,
    };
    // = (0*1.0 + 1.0*1.0 + 1.0*1.0) / 3.0 = 2/3
    const score = computeWeightedScore(breakdown, weights);
    expect(score).toBeCloseTo(2 / 3, 4);
  });
});

describe("MATCH_SCORE_THRESHOLD", () => {
  it("is 0.05", () => {
    expect(MATCH_SCORE_THRESHOLD).toBe(0.05);
  });
});

describe("DEFAULT_WEIGHTS", () => {
  it("uses spec-defined weights", () => {
    expect(DEFAULT_WEIGHTS).toEqual({
      semantic: 1.0,
      availability: 1.0,
      skill_level: 0.7,
      location: 0.7,
    });
  });
});

describe("normalizeWeights", () => {
  it("normalizes weights to sum to 1", () => {
    const normalized = normalizeWeights(DEFAULT_WEIGHTS);
    const sum =
      normalized.semantic +
      normalized.availability +
      normalized.skill_level +
      normalized.location;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("handles all-zero weights", () => {
    const result = normalizeWeights({
      semantic: 0,
      availability: 0,
      skill_level: 0,
      location: 0,
    });
    expect(result).toEqual({
      semantic: 0,
      availability: 0,
      skill_level: 0,
      location: 0,
    });
  });
});

describe("formatScore", () => {
  it("formats 0-1 score as percentage", () => {
    expect(formatScore(0)).toBe("0%");
    expect(formatScore(0.5)).toBe("50%");
    expect(formatScore(1)).toBe("100%");
    expect(formatScore(0.756)).toBe("76%");
  });
});

describe("getScoreColorVariant", () => {
  it("returns success for scores >= 0.7", () => {
    expect(getScoreColorVariant(0.7)).toBe("success");
    expect(getScoreColorVariant(1.0)).toBe("success");
  });

  it("returns warning for scores >= 0.5 and < 0.7", () => {
    expect(getScoreColorVariant(0.5)).toBe("warning");
    expect(getScoreColorVariant(0.69)).toBe("warning");
  });

  it("returns destructive for scores < 0.5", () => {
    expect(getScoreColorVariant(0.49)).toBe("destructive");
    expect(getScoreColorVariant(0)).toBe("destructive");
  });
});
