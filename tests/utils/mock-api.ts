/**
 * API Mocking Utilities for E2E Tests
 * Mocks external AI API calls to eliminate API key requirements and costs
 * Uses nock for Node.js level HTTP interception (works with Playwright request context)
 */

import nock from "nock";
import * as fs from "fs";
import * as path from "path";

// Load mock response fixtures
const openaiChatCompletionMock = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../fixtures/api/openai-chat-completion.json"),
    "utf-8",
  ),
);

const openaiEmbeddingsMock = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../fixtures/api/openai-embeddings.json"),
    "utf-8",
  ),
);

const geminiExplanationMock = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../fixtures/api/gemini-explanation.json"),
    "utf-8",
  ),
);

/**
 * Generate a random 1536-dimensional embedding vector for mocking
 * Ensures consistent format matching OpenAI's text-embedding-3-small model
 */
function generateMockEmbedding(): number[] {
  // Generate normalized vector with small random values
  return Array(1536)
    .fill(0)
    .map(() => (Math.random() - 0.5) * 0.2);
}

/**
 * Mock OpenAI Chat Completion API (GPT-4o-mini)
 * Used for profile/project extraction via function calling
 *
 * @param customResponse - Optional custom response data to override default
 * @param persist - If true, mock will persist for multiple requests
 */
export function mockOpenAIChatCompletion(
  customResponse?: Record<string, unknown>,
  persist: boolean = false,
): nock.Scope {
  const response = customResponse || openaiChatCompletionMock;

  const scope = nock("https://api.openai.com")
    .post("/v1/chat/completions")
    .reply(200, response, {
      "Content-Type": "application/json",
    });

  if (persist) {
    scope.persist();
  }

  return scope;
}

/**
 * Mock OpenAI Embeddings API (text-embedding-3-small)
 * Generates realistic 1536-dimensional vectors for similarity matching
 *
 * @param fixedVector - Optional fixed vector for deterministic testing
 * @param persist - If true, mock will persist for multiple requests
 */
export function mockOpenAIEmbeddings(
  fixedVector?: number[],
  persist: boolean = false,
): nock.Scope {
  const mockVector = fixedVector || generateMockEmbedding();

  const response = {
    ...openaiEmbeddingsMock,
    data: [
      {
        ...openaiEmbeddingsMock.data[0],
        embedding: mockVector,
      },
    ],
  };

  const scope = nock("https://api.openai.com")
    .post("/v1/embeddings")
    .reply(200, response, {
      "Content-Type": "application/json",
    });

  if (persist) {
    scope.persist();
  }

  return scope;
}

/**
 * Mock Google Gemini API (Gemini 2.0 Flash)
 * Used for match explanation generation
 *
 * @param customExplanation - Optional custom explanation text
 * @param persist - If true, mock will persist for multiple requests
 */
export function mockGeminiAPI(
  customExplanation?: string,
  persist: boolean = false,
): nock.Scope {
  const response = customExplanation
    ? {
        ...geminiExplanationMock,
        candidates: [
          {
            ...geminiExplanationMock.candidates[0],
            content: {
              ...geminiExplanationMock.candidates[0].content,
              parts: [{ text: customExplanation }],
            },
          },
        ],
      }
    : geminiExplanationMock;

  const scope = nock("https://generativelanguage.googleapis.com")
    .post(/.*/)
    .reply(200, response, {
      "Content-Type": "application/json",
    });

  if (persist) {
    scope.persist();
  }

  return scope;
}

/**
 * Mock all AI APIs at once (convenience function)
 * Use this in test beforeEach() to mock all external API calls
 *
 * @param persist - If true, mocks will persist for multiple requests
 */
export function mockAllAIAPIs(persist: boolean = true): void {
  // Allow localhost and Supabase requests to pass through
  // Only mock AI API calls (OpenAI, Gemini)
  nock.enableNetConnect("localhost");
  nock.enableNetConnect("127.0.0.1");
  nock.enableNetConnect(/^localhost:/);
  nock.enableNetConnect(/\.supabase\.co$/);

  mockOpenAIChatCompletion(undefined, persist);
  mockOpenAIEmbeddings(undefined, persist);
  mockGeminiAPI(undefined, persist);
}

/**
 * Remove all API mocks and restore normal behavior
 * Use this in test afterEach() for cleanup
 */
export function cleanupAPIMocks(): void {
  nock.cleanAll();
}

/**
 * Enable/disable actual HTTP requests
 * By default, nock blocks all unmocked HTTP requests when active
 */
export function allowRealHTTP(allow: boolean = true): void {
  if (allow) {
    nock.enableNetConnect();
  } else {
    nock.disableNetConnect();
  }
}
