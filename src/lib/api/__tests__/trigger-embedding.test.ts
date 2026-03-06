// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { triggerEmbeddingGeneration } from "../trigger-embedding";

describe("triggerEmbeddingGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns immediately on successful response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    await triggerEmbeddingGeneration(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("retries on failure and succeeds", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    const promise = triggerEmbeddingGeneration(1);
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("calls Sentry after all retries exhausted", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const promise = triggerEmbeddingGeneration(1);
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Failed to trigger embedding generation after retries",
      expect.objectContaining({ level: "warning" }),
    );
    warnSpy.mockRestore();
  });

  it("retries on network error (fetch throws)", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ ok: true });

    const promise = triggerEmbeddingGeneration(1);
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("uses EMBEDDINGS_API_KEY when available", async () => {
    process.env.EMBEDDINGS_API_KEY = "emb-key";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await triggerEmbeddingGeneration(0);

    expect(fetch).toHaveBeenCalledWith(
      "/api/embeddings/process",
      expect.objectContaining({
        headers: { Authorization: "Bearer emb-key" },
      }),
    );

    delete process.env.EMBEDDINGS_API_KEY;
  });

  it("falls back to SUPABASE_SECRET_KEY when EMBEDDINGS_API_KEY is not set", async () => {
    delete process.env.EMBEDDINGS_API_KEY;
    process.env.SUPABASE_SECRET_KEY = "sb-key";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await triggerEmbeddingGeneration(0);

    expect(fetch).toHaveBeenCalledWith(
      "/api/embeddings/process",
      expect.objectContaining({
        headers: { Authorization: "Bearer sb-key" },
      }),
    );
  });
});
