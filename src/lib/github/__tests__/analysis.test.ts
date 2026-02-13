// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Gemini module
const mockGenerateStructuredJSON = vi.fn();
const mockIsGeminiConfigured = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({
  generateStructuredJSON: (...args: unknown[]) =>
    mockGenerateStructuredJSON(...args),
  isGeminiConfigured: () => mockIsGeminiConfigured(),
}));

// Mock @google/generative-ai SchemaType enum
vi.mock("@google/generative-ai", () => ({
  SchemaType: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
  },
}));

import { analyzeGitHubProfile, validateAnalysisOutput } from "../analysis";
import type { GitHubAnalysisInput, GitHubAnalysisOutput } from "../types";

const sampleInput: GitHubAnalysisInput = {
  username: "testuser",
  languages: ["TypeScript", "Python"],
  topics: ["web", "api"],
  recentCommits: ["feat: add auth", "fix: resolve bug"],
  codeSnippets: [],
  readmeSnippets: ["# My project"],
  repoDescriptions: ["repo1: A cool project"],
  repoCount: 5,
  totalStars: 50,
  accountAge: 3,
};

const sampleOutput: GitHubAnalysisOutput = {
  inferredSkills: ["TypeScript", "React", "API Design"],
  inferredInterests: ["Web Development", "Authentication"],
  codingStyle: "Clean code with good commit messages",
  collaborationStyle: "async",
  experienceLevel: "intermediate",
  experienceSignals: ["Good commit discipline", "Multiple languages"],
  suggestedBio:
    "A versatile developer with experience in TypeScript and Python.",
};

describe("GitHub Analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGeminiConfigured.mockReturnValue(true);
  });

  describe("analyzeGitHubProfile", () => {
    it("returns analysis output on success", async () => {
      mockGenerateStructuredJSON.mockResolvedValue(sampleOutput);

      const result = await analyzeGitHubProfile(sampleInput);

      expect(result.inferredSkills).toEqual(sampleOutput.inferredSkills);
      expect(result.inferredInterests).toEqual(sampleOutput.inferredInterests);
      expect(result.codingStyle).toBe(sampleOutput.codingStyle);
      expect(result.collaborationStyle).toBe("async");
      expect(result.experienceLevel).toBe("intermediate");
      expect(result.suggestedBio).toBeTruthy();
    });

    it("throws when Gemini is not configured", async () => {
      mockIsGeminiConfigured.mockReturnValue(false);

      await expect(analyzeGitHubProfile(sampleInput)).rejects.toThrow(
        "GEMINI_API_KEY environment variable is not set",
      );
    });

    it("handles missing fields in response with defaults", async () => {
      mockGenerateStructuredJSON.mockResolvedValue({
        inferredSkills: null,
        inferredInterests: null,
        codingStyle: null,
        collaborationStyle: null,
        experienceLevel: null,
        experienceSignals: null,
        suggestedBio: null,
      });

      const result = await analyzeGitHubProfile(sampleInput);

      expect(result.inferredSkills).toEqual([]);
      expect(result.inferredInterests).toEqual([]);
      expect(result.codingStyle).toBe("Unknown");
      expect(result.collaborationStyle).toBe("hybrid");
      expect(result.experienceLevel).toBe("intermediate");
      expect(result.experienceSignals).toEqual([]);
      expect(result.suggestedBio).toBe("");
    });

    it("passes prompt with username to Gemini", async () => {
      mockGenerateStructuredJSON.mockResolvedValue(sampleOutput);

      await analyzeGitHubProfile(sampleInput);

      expect(mockGenerateStructuredJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining("@testuser"),
          temperature: 0.3,
        }),
      );
    });

    it("includes languages and topics in prompt", async () => {
      mockGenerateStructuredJSON.mockResolvedValue(sampleOutput);

      await analyzeGitHubProfile(sampleInput);

      const call = mockGenerateStructuredJSON.mock.calls[0][0];
      expect(call.userPrompt).toContain("TypeScript");
      expect(call.userPrompt).toContain("Python");
      expect(call.userPrompt).toContain("web");
      expect(call.userPrompt).toContain("api");
    });

    it("propagates Gemini errors", async () => {
      mockGenerateStructuredJSON.mockRejectedValue(
        new Error("Gemini rate limit"),
      );

      await expect(analyzeGitHubProfile(sampleInput)).rejects.toThrow(
        "Gemini rate limit",
      );
    });
  });

  describe("validateAnalysisOutput", () => {
    it("returns true for valid output", () => {
      expect(validateAnalysisOutput(sampleOutput)).toBe(true);
    });

    it("returns false when inferredSkills is not an array", () => {
      const invalid = { ...sampleOutput, inferredSkills: "not-array" };
      expect(
        validateAnalysisOutput(invalid as unknown as GitHubAnalysisOutput),
      ).toBe(false);
    });

    it("returns false when inferredInterests is not an array", () => {
      const invalid = { ...sampleOutput, inferredInterests: null };
      expect(
        validateAnalysisOutput(invalid as unknown as GitHubAnalysisOutput),
      ).toBe(false);
    });

    it("returns false when codingStyle is not a string", () => {
      const invalid = { ...sampleOutput, codingStyle: 123 };
      expect(
        validateAnalysisOutput(invalid as unknown as GitHubAnalysisOutput),
      ).toBe(false);
    });

    it("returns false for invalid collaborationStyle", () => {
      const invalid = { ...sampleOutput, collaborationStyle: "unknown" };
      expect(
        validateAnalysisOutput(invalid as unknown as GitHubAnalysisOutput),
      ).toBe(false);
    });

    it("returns false for invalid experienceLevel", () => {
      const invalid = { ...sampleOutput, experienceLevel: "expert" };
      expect(
        validateAnalysisOutput(invalid as unknown as GitHubAnalysisOutput),
      ).toBe(false);
    });

    it("returns true for all valid collaborationStyle values", () => {
      for (const style of ["async", "sync", "hybrid"] as const) {
        const output = { ...sampleOutput, collaborationStyle: style };
        expect(validateAnalysisOutput(output)).toBe(true);
      }
    });

    it("returns true for all valid experienceLevel values", () => {
      for (const level of [
        "junior",
        "intermediate",
        "senior",
        "lead",
      ] as const) {
        const output = { ...sampleOutput, experienceLevel: level };
        expect(validateAnalysisOutput(output)).toBe(true);
      }
    });
  });
});
