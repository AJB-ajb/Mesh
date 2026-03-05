import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SchemaType } from "@google/generative-ai";
import { GEMINI_MODELS } from "@/lib/constants";

// Mock the @google/generative-ai module
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  return {
    ...actual,
    GoogleGenerativeAI: class {
      getGenerativeModel = mockGetGenerativeModel;
    },
  };
});

describe("gemini fallback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    // Reset the cached genAI singleton between tests
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function importFresh() {
    const mod = await import("../gemini");
    return mod;
  }

  describe("generateStructuredJSON", () => {
    const opts = {
      systemPrompt: "Extract data",
      userPrompt: "test input",
      schema: { type: SchemaType.OBJECT as const, properties: {} },
    };

    it("succeeds on first model without fallback", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => '{"result": "ok"}' },
      });

      const result = await generateStructuredJSON(opts);

      expect(result).toEqual({ result: "ok" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("falls back to next model on 429 error", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent
        .mockRejectedValueOnce(new Error("429 Too Many Requests"))
        .mockResolvedValueOnce({
          response: { text: () => '{"result": "fallback"}' },
        });

      const result = await generateStructuredJSON(opts);

      expect(result).toEqual({ result: "fallback" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("falls back on RESOURCE_EXHAUSTED error", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent
        .mockRejectedValueOnce(new Error("RESOURCE_EXHAUSTED"))
        .mockResolvedValueOnce({
          response: { text: () => '{"result": "ok"}' },
        });

      const result = await generateStructuredJSON(opts);

      expect(result).toEqual({ result: "ok" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("falls back on 503 UNAVAILABLE (high demand)", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent
        .mockRejectedValueOnce(
          new Error(
            "503 UNAVAILABLE: This model is currently experiencing high demand",
          ),
        )
        .mockResolvedValueOnce({
          response: { text: () => '{"result": "ok"}' },
        });

      const result = await generateStructuredJSON(opts);

      expect(result).toEqual({ result: "ok" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("falls back on timeout error", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent
        .mockRejectedValueOnce(
          new Error("Gemini generateContent timed out after 15000ms"),
        )
        .mockResolvedValueOnce({
          response: { text: () => '{"result": "ok"}' },
        });

      const result = await generateStructuredJSON(opts);

      expect(result).toEqual({ result: "ok" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("throws immediately on non-transient error", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent.mockRejectedValueOnce(new Error("Invalid API key"));

      await expect(generateStructuredJSON(opts)).rejects.toThrow(
        "Invalid API key",
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("throws last error when all models exhausted", async () => {
      const { generateStructuredJSON } = await importFresh();
      const standardModelCount = GEMINI_MODELS.standard.length;
      for (let i = 0; i < standardModelCount - 1; i++) {
        mockGenerateContent.mockRejectedValueOnce(
          new Error("429 Too Many Requests"),
        );
      }
      mockGenerateContent.mockRejectedValueOnce(
        new Error("429 Too Many Requests - last"),
      );

      await expect(generateStructuredJSON(opts)).rejects.toThrow(
        "429 Too Many Requests - last",
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(standardModelCount);
    });

    it("uses fast tier when specified", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => '{"result": "ok"}' },
      });

      await generateStructuredJSON({ ...opts, tier: "fast" });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-3.1-flash-lite-preview",
      });
    });

    it("uses standard tier by default", async () => {
      const { generateStructuredJSON } = await importFresh();
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => '{"result": "ok"}' },
      });

      await generateStructuredJSON(opts);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-3-flash-preview",
      });
    });
  });

  describe("generateContentWithFallback", () => {
    const opts = {
      contents: [{ role: "user" as const, parts: [{ text: "hello" }] }],
      generationConfig: { temperature: 0.7 },
    };

    it("succeeds on first model", async () => {
      const { generateContentWithFallback } = await importFresh();
      const mockResult = { response: { text: () => "response" } };
      mockGenerateContent.mockResolvedValueOnce(mockResult);

      const result = await generateContentWithFallback(opts);

      expect(result).toBe(mockResult);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("falls back on 429 and succeeds on next model", async () => {
      const { generateContentWithFallback } = await importFresh();
      const mockResult = { response: { text: () => "fallback response" } };
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Too Many Requests"))
        .mockResolvedValueOnce(mockResult);

      const result = await generateContentWithFallback(opts);

      expect(result).toBe(mockResult);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("falls back on 503 and timeout errors", async () => {
      const { generateContentWithFallback } = await importFresh();
      const mockResult = { response: { text: () => "ok" } };
      mockGenerateContent
        .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
        .mockRejectedValueOnce(
          new Error("Gemini generateContent timed out after 15000ms"),
        )
        .mockResolvedValueOnce(mockResult);

      const result = await generateContentWithFallback(opts);

      expect(result).toBe(mockResult);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it("throws immediately on non-transient error", async () => {
      const { generateContentWithFallback } = await importFresh();
      mockGenerateContent.mockRejectedValueOnce(new Error("Server error"));

      await expect(generateContentWithFallback(opts)).rejects.toThrow(
        "Server error",
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("throws when all models exhausted", async () => {
      const { generateContentWithFallback } = await importFresh();
      const standardModelCount = GEMINI_MODELS.standard.length;
      for (let i = 0; i < standardModelCount - 1; i++) {
        mockGenerateContent.mockRejectedValueOnce(new Error("429"));
      }
      mockGenerateContent.mockRejectedValueOnce(new Error("429 final"));

      await expect(generateContentWithFallback(opts)).rejects.toThrow(
        "429 final",
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(standardModelCount);
    });
  });
});
