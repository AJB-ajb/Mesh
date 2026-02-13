import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateEmbeddingsBatch,
  composeProfileText,
  composePostingText,
} from "../embeddings";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("batch embeddings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("generateEmbeddingsBatch", () => {
    it("returns empty array for empty input", async () => {
      const result = await generateEmbeddingsBatch([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sends batch request with array input", async () => {
      const mockEmbeddings = [
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { index: 0, embedding: mockEmbeddings[0] },
            { index: 1, embedding: mockEmbeddings[1] },
          ],
        }),
      });

      const result = await generateEmbeddingsBatch(["text one", "text two"]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/embeddings");

      const body = JSON.parse(options.body);
      expect(body.input).toEqual(["text one", "text two"]);
      expect(body.model).toBe("text-embedding-3-small");
      expect(body.dimensions).toBe(1536);

      expect(result).toEqual(mockEmbeddings);
    });

    it("sorts results by index to guarantee order", async () => {
      const embedding0 = new Array(1536).fill(0.1);
      const embedding1 = new Array(1536).fill(0.2);
      // Simulate out-of-order response from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { index: 1, embedding: embedding1 },
            { index: 0, embedding: embedding0 },
          ],
        }),
      });

      const result = await generateEmbeddingsBatch(["first", "second"]);

      expect(result[0]).toEqual(embedding0);
      expect(result[1]).toEqual(embedding1);
    });

    it("trims input texts", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ index: 0, embedding: mockEmbedding }],
        }),
      });

      await generateEmbeddingsBatch(["  trimmed text  "]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.input).toEqual(["trimmed text"]);
    });

    it("throws error for empty text in batch", async () => {
      await expect(generateEmbeddingsBatch(["valid", ""])).rejects.toThrow(
        "Text at index 1 cannot be empty",
      );
    });

    it("throws error for whitespace-only text in batch", async () => {
      await expect(generateEmbeddingsBatch(["valid", "   "])).rejects.toThrow(
        "Text at index 1 cannot be empty",
      );
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({ error: { message: "Rate limit exceeded" } }),
      });

      await expect(generateEmbeddingsBatch(["test"])).rejects.toThrow(
        "OpenAI API error: 429",
      );
    });

    it("throws error on invalid response format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(generateEmbeddingsBatch(["test"])).rejects.toThrow(
        "Invalid batch embedding response",
      );
    });

    it("throws error on mismatched embedding count", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ index: 0, embedding: new Array(1536).fill(0.1) }],
        }),
      });

      await expect(generateEmbeddingsBatch(["one", "two"])).rejects.toThrow(
        "Expected 2 embeddings, got 1",
      );
    });

    it("throws error on wrong embedding dimension in batch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ index: 0, embedding: new Array(768).fill(0.1) }],
        }),
      });

      await expect(generateEmbeddingsBatch(["test"])).rejects.toThrow(
        "Invalid embedding in batch response",
      );
    });

    it("throws when OPENAI_API_KEY is missing", async () => {
      vi.stubEnv("OPENAI_API_KEY", "");

      await expect(generateEmbeddingsBatch(["test"])).rejects.toThrow(
        "OPENAI_API_KEY",
      );
    });

    it("handles single-item batch", async () => {
      const mockEmbedding = new Array(1536).fill(0.5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ index: 0, embedding: mockEmbedding }],
        }),
      });

      const result = await generateEmbeddingsBatch(["single item"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEmbedding);
    });
  });

  describe("composeProfileText", () => {
    it("combines all profile fields", () => {
      const result = composeProfileText(
        "I am a developer",
        ["TypeScript", "React"],
        ["open source"],
        "Full Stack Dev",
      );

      expect(result).toContain("Headline: Full Stack Dev");
      expect(result).toContain("About: I am a developer");
      expect(result).toContain("Skills: TypeScript, React");
      expect(result).toContain("Interests: open source");
    });

    it("handles null fields", () => {
      const result = composeProfileText(null, ["TypeScript"], null, null);

      expect(result).toBe("Skills: TypeScript");
      expect(result).not.toContain("Headline:");
      expect(result).not.toContain("About:");
      expect(result).not.toContain("Interests:");
    });

    it("handles empty arrays", () => {
      const result = composeProfileText("bio", [], [], "headline");

      expect(result).toContain("Headline: headline");
      expect(result).toContain("About: bio");
      expect(result).not.toContain("Skills:");
      expect(result).not.toContain("Interests:");
    });

    it("returns empty string when all fields are null/empty", () => {
      const result = composeProfileText(null, null, null, null);
      expect(result).toBe("");
    });
  });

  describe("composePostingText", () => {
    it("combines all posting fields", () => {
      const result = composePostingText("AI Project", "Build an AI assistant", [
        "Python",
        "ML",
      ]);

      expect(result).toContain("Title: AI Project");
      expect(result).toContain("Description: Build an AI assistant");
      expect(result).toContain("Required Skills: Python, ML");
    });

    it("handles null skills", () => {
      const result = composePostingText("Title", "Description", null);

      expect(result).toContain("Title: Title");
      expect(result).toContain("Description: Description");
      expect(result).not.toContain("Required Skills:");
    });

    it("handles empty skills array", () => {
      const result = composePostingText("Title", "Description", []);

      expect(result).not.toContain("Required Skills:");
    });
  });
});
