/**
 * Match Factory
 * Creates test match data for MeshIt matches table
 */

import { faker } from "@faker-js/faker";

export type TestMatch = {
  id: string;
  posting_id: string;
  user_id: string;
  similarity_score: number;
  score_breakdown: {
    semantic: number;
    availability: number;
    skill_level: number;
    location: number;
  } | null;
  explanation: string | null;
  status: "pending" | "applied" | "accepted" | "declined";
  created_at: Date;
  responded_at: Date | null;
};

export const createMatch = (overrides: Partial<TestMatch> = {}): TestMatch => {
  const similarityScore = faker.number.float({
    min: 0.5,
    max: 1.0,
    precision: 0.01,
  });

  return {
    id: faker.string.uuid(),
    posting_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    similarity_score: similarityScore,
    score_breakdown: {
      semantic: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
      availability: faker.number.float({ min: 0.4, max: 1.0, precision: 0.01 }),
      skill_level: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
      location: faker.number.float({ min: 0.3, max: 1.0, precision: 0.01 }),
    },
    explanation: `This is a ${Math.round(similarityScore * 100)}% match based on relevance and skill level.`,
    status: "pending",
    created_at: new Date(),
    responded_at: null,
    ...overrides,
  };
};

export const createMatches = (
  count: number,
  overrides: Partial<TestMatch> = {},
): TestMatch[] => {
  return Array.from({ length: count }, () => createMatch(overrides));
};

/**
 * Create a high-scoring match (>80%)
 */
export const createHighScoreMatch = (
  overrides: Partial<TestMatch> = {},
): TestMatch => {
  return createMatch({
    similarity_score: faker.number.float({
      min: 0.8,
      max: 1.0,
      precision: 0.01,
    }),
    score_breakdown: {
      semantic: 0.9,
      availability: 0.85,
      skill_level: 0.88,
      location: 0.8,
    },
    ...overrides,
  });
};

/**
 * Create an accepted match
 */
export const createAcceptedMatch = (
  overrides: Partial<TestMatch> = {},
): TestMatch => {
  return createMatch({
    status: "accepted",
    responded_at: new Date(),
    ...overrides,
  });
};
