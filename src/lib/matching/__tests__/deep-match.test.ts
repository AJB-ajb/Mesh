import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generateStructuredJSON: vi.fn(),
  isGeminiConfigured: vi.fn(() => true),
}));

import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";
import {
  deepMatchCandidate,
  deepMatchCandidates,
  blendScores,
  isDeepMatchAvailable,
} from "../deep-match";

describe("deepMatchCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generateStructuredJSON with correct params and returns result", async () => {
    vi.mocked(generateStructuredJSON).mockResolvedValue({
      identified_roles: ["Frontend Developer", "Designer"],
      matched_role: "Frontend Developer",
      score: 0.85,
      explanation: "Strong frontend skills match the project needs.",
      concerns: "No design experience mentioned.",
    });

    const result = await deepMatchCandidate({
      postingTitle: "Web App",
      postingText: "Building a React web app",
      profileText: "Experienced React developer",
      fastFilterScore: 0.7,
      sharedSkills: ["React", "TypeScript"],
      availabilityOverlap: 0.8,
      distanceKm: 50,
      semanticScore: 0.75,
    });

    expect(result.score).toBe(0.85);
    expect(result.explanation).toBe(
      "Strong frontend skills match the project needs.",
    );
    expect(result.matchedRole).toBe("Frontend Developer");
    expect(result.identifiedRoles).toEqual(["Frontend Developer", "Designer"]);
    expect(result.concerns).toBe("No design experience mentioned.");
    expect(generateStructuredJSON).toHaveBeenCalledOnce();
  });

  it("clamps score to 0-1 range", async () => {
    vi.mocked(generateStructuredJSON).mockResolvedValue({
      identified_roles: ["Developer"],
      matched_role: "Developer",
      score: 1.5,
      explanation: "Great match",
      concerns: "",
    });

    const result = await deepMatchCandidate({
      postingTitle: "Test",
      postingText: "Test posting",
      profileText: "Test profile",
      fastFilterScore: 0.5,
      sharedSkills: [],
      availabilityOverlap: null,
      distanceKm: null,
      semanticScore: null,
    });

    expect(result.score).toBe(1);
  });
});

describe("deepMatchCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes candidates in batches", async () => {
    vi.mocked(generateStructuredJSON).mockResolvedValue({
      identified_roles: ["Developer"],
      matched_role: "Developer",
      score: 0.8,
      explanation: "Good match",
      concerns: "",
    });

    const candidateCount = 7;
    const candidates = Array.from({ length: candidateCount }, (_, i) => ({
      profileText: `Profile ${i}`,
      fastFilterScore: 0.5 + i * 0.05,
      sharedSkills: ["JS"],
      availabilityOverlap: null,
      distanceKm: null,
      semanticScore: null,
    }));

    const concurrency = 3;
    const results = await deepMatchCandidates(
      "Test Posting",
      "Build something",
      candidates,
      { concurrency },
    );

    expect(results).toHaveLength(candidateCount);
    expect(generateStructuredJSON).toHaveBeenCalledTimes(candidateCount);
  });

  it("handles individual failures gracefully", async () => {
    let callCount = 0;
    vi.mocked(generateStructuredJSON).mockImplementation(async () => {
      callCount++;
      if (callCount === 2) throw new Error("Rate limited");
      return {
        identified_roles: ["Dev"],
        matched_role: "Dev",
        score: 0.7,
        explanation: "Match",
        concerns: "",
      };
    });

    const results = await deepMatchCandidates("Test", "Build", [
      {
        profileText: "A",
        fastFilterScore: 0.5,
        sharedSkills: [],
        availabilityOverlap: null,
        distanceKm: null,
        semanticScore: null,
      },
      {
        profileText: "B",
        fastFilterScore: 0.6,
        sharedSkills: [],
        availabilityOverlap: null,
        distanceKm: null,
        semanticScore: null,
      },
      {
        profileText: "C",
        fastFilterScore: 0.7,
        sharedSkills: [],
        availabilityOverlap: null,
        distanceKm: null,
        semanticScore: null,
      },
    ]);

    // One failed, two succeeded
    expect(results).toHaveLength(2);
  });
});

describe("blendScores", () => {
  it("returns fast-filter score when deep match is null", () => {
    expect(blendScores(0.8, null)).toBe(0.8);
  });

  it("blends scores with correct weights (0.4 fast + 0.6 deep)", () => {
    const result = blendScores(0.8, 0.9);
    expect(result).toBeCloseTo(0.4 * 0.8 + 0.6 * 0.9);
  });

  it("handles edge case of both zero", () => {
    expect(blendScores(0, 0)).toBe(0);
  });
});

describe("isDeepMatchAvailable", () => {
  it("returns true when Gemini is configured", () => {
    vi.mocked(isGeminiConfigured).mockReturnValue(true);
    expect(isDeepMatchAvailable()).toBe(true);
  });

  it("returns false when Gemini is not configured", () => {
    vi.mocked(isGeminiConfigured).mockReturnValue(false);
    expect(isDeepMatchAvailable()).toBe(false);
  });
});
