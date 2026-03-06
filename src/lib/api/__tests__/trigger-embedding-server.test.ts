// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import {
  getBaseUrl,
  triggerEmbeddingGenerationServer,
} from "../trigger-embedding-server";

describe("getBaseUrl", () => {
  const ENV_BACKUP: Record<string, string | undefined> = {};
  const KEYS = [
    "NEXT_PUBLIC_APP_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_BRANCH_URL",
    "VERCEL_URL",
  ];

  beforeEach(() => {
    for (const k of KEYS) {
      ENV_BACKUP[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (ENV_BACKUP[k] !== undefined) process.env[k] = ENV_BACKUP[k];
      else delete process.env[k];
    }
  });

  it("returns origin when provided", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://should-not-use.com";
    expect(getBaseUrl("https://my-origin.com")).toBe("https://my-origin.com");
  });

  it("returns NEXT_PUBLIC_APP_URL when set and no origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(getBaseUrl()).toBe("https://app.example.com");
  });

  it("prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "mesh-it.vercel.app";
    process.env.VERCEL_URL = "mesh-abc123.vercel.app";
    expect(getBaseUrl()).toBe("https://mesh-it.vercel.app");
  });

  it("prefers VERCEL_BRANCH_URL over VERCEL_URL", () => {
    process.env.VERCEL_BRANCH_URL = "mesh-git-dev.vercel.app";
    process.env.VERCEL_URL = "mesh-abc123.vercel.app";
    expect(getBaseUrl()).toBe("https://mesh-git-dev.vercel.app");
  });

  it("falls back to VERCEL_URL", () => {
    process.env.VERCEL_URL = "mesh-abc123.vercel.app";
    expect(getBaseUrl()).toBe("https://mesh-abc123.vercel.app");
  });

  it("falls back to localhost when no env vars set", () => {
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("triggerEmbeddingGenerationServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("skips when EMBEDDINGS_API_KEY is not set", async () => {
    const saved = process.env.EMBEDDINGS_API_KEY;
    delete process.env.EMBEDDINGS_API_KEY;

    await triggerEmbeddingGenerationServer("http://localhost:3000", 0);
    expect(fetch).not.toHaveBeenCalled();

    if (saved) process.env.EMBEDDINGS_API_KEY = saved;
  });

  it("calls the correct URL using the provided origin", async () => {
    process.env.EMBEDDINGS_API_KEY = "test-key";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await triggerEmbeddingGenerationServer("https://mesh-it.vercel.app", 0);

    expect(fetch).toHaveBeenCalledWith(
      "https://mesh-it.vercel.app/api/embeddings/process",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-key" },
      }),
    );

    delete process.env.EMBEDDINGS_API_KEY;
  });

  it("reports to Sentry after all retries exhausted", async () => {
    process.env.EMBEDDINGS_API_KEY = "test-key";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    const promise = triggerEmbeddingGenerationServer(
      "http://localhost:3000",
      1,
    );
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Failed to trigger server-side embedding generation after retries",
      expect.objectContaining({
        level: "warning",
        extra: expect.objectContaining({
          url: "http://localhost:3000/api/embeddings/process",
          lastStatus: 500,
        }),
      }),
    );

    warnSpy.mockRestore();
    delete process.env.EMBEDDINGS_API_KEY;
  });
});
