import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateEmbedding,
  generateProfileEmbedding,
  generateProjectEmbedding,
  validateEmbedding,
} from "../embeddings";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("embeddings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("validateEmbedding", () => {
    it("returns true for valid 1536-dimensional embedding", () => {
      const embedding = new Array(1536).fill(0.1);
      expect(validateEmbedding(embedding)).toBe(true);
    });

    it("returns false for null embedding", () => {
      expect(validateEmbedding(null)).toBe(false);
    });

    it("returns false for wrong dimension embedding", () => {
      const embedding = new Array(768).fill(0.1);
      expect(validateEmbedding(embedding)).toBe(false);
    });

    it("returns false for empty array", () => {
      expect(validateEmbedding([])).toBe(false);
    });

    it("returns false for non-array values", () => {
      // @ts-expect-error - testing runtime behavior
      expect(validateEmbedding("not an array")).toBe(false);
      // @ts-expect-error - testing runtime behavior
      expect(validateEmbedding({})).toBe(false);
      // @ts-expect-error - testing runtime behavior
      expect(validateEmbedding(123)).toBe(false);
    });
  });

  describe("generateEmbedding", () => {
    // Note: Testing API key absence requires module reload which is complex in vitest
    // The module checks for OPENAI_API_KEY at load time and throws at runtime if missing

    it("throws error for empty text", async () => {
      await expect(generateEmbedding("")).rejects.toThrow(
        "Text cannot be empty",
      );
      await expect(generateEmbedding("   ")).rejects.toThrow(
        "Text cannot be empty",
      );
    });

    it("calls OpenAI API with correct endpoint and method", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const result = await generateEmbedding("test text");

      // Verify the API was called with correct URL and method
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/embeddings");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers["Authorization"]).toMatch(/^Bearer /);

      // Verify the body contains correct model and input
      const body = JSON.parse(options.body);
      expect(body.model).toBe("text-embedding-3-small");
      expect(body.input).toBe("test text");
      expect(body.dimensions).toBe(1536);

      expect(result).toEqual(mockEmbedding);
    });

    it("trims input text before sending", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateEmbedding("  test text  ");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"input":"test text"'),
        }),
      );
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "Invalid API key" } }),
      });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "OpenAI API error: 401",
      );
    });

    it("throws error on invalid response format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Invalid embedding response from OpenAI API",
      );
    });

    it("throws error on wrong embedding dimension", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(768).fill(0.1) }],
        }),
      });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Expected embedding dimension 1536, got 768",
      );
    });
  });

  describe("generateProfileEmbedding", () => {
    it("combines profile fields into embedding text", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateProfileEmbedding(
        "I am a developer",
        ["TypeScript", "React"],
        ["open source", "web dev"],
        "Full Stack Developer",
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).toContain("Headline: Full Stack Developer");
      expect(callBody.input).toContain("About: I am a developer");
      expect(callBody.input).toContain("Skills: TypeScript, React");
      expect(callBody.input).toContain("Interests: open source, web dev");
    });

    it("handles null fields gracefully", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateProfileEmbedding(null, ["TypeScript"], null, null);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).toContain("Skills: TypeScript");
      expect(callBody.input).not.toContain("Headline:");
      expect(callBody.input).not.toContain("About:");
      expect(callBody.input).not.toContain("Interests:");
    });

    it("handles empty arrays", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateProfileEmbedding("bio", [], [], "headline");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).not.toContain("Skills:");
      expect(callBody.input).not.toContain("Interests:");
    });

    it("throws error when all fields are empty", async () => {
      await expect(
        generateProfileEmbedding(null, null, null, null),
      ).rejects.toThrow("Profile must have at least one field");

      await expect(generateProfileEmbedding("", [], [], "")).rejects.toThrow(
        "Profile must have at least one field",
      );
    });
  });

  describe("generateProjectEmbedding", () => {
    it("combines project fields into embedding text", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateProjectEmbedding(
        "AI Assistant",
        "Build an AI-powered coding assistant",
        ["Python", "Machine Learning"],
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).toContain("Title: AI Assistant");
      expect(callBody.input).toContain(
        "Description: Build an AI-powered coding assistant",
      );
      expect(callBody.input).toContain(
        "Required Skills: Python, Machine Learning",
      );
    });

    it("handles null required skills", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateProjectEmbedding("Project", "Description", null);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).not.toContain("Required Skills:");
    });

    it("handles empty required skills array", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await generateProjectEmbedding("Project", "Description", []);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).not.toContain("Required Skills:");
    });
  });
});
