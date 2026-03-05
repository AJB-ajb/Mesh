import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { logFireAndForget } from "../fire-and-forget";

describe("logFireAndForget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when the promise rejects", () => {
    const failing = Promise.reject(new Error("boom"));

    // Should not throw — the whole point of fire-and-forget
    expect(() => logFireAndForget(failing, "test-op")).not.toThrow();
  });

  it("calls Sentry.captureException when the promise rejects", async () => {
    const error = new Error("something broke");
    const failing = Promise.reject(error);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logFireAndForget(failing, "test-op");

    // Wait for the microtask queue to flush so the .catch handler runs
    await new Promise((r) => setTimeout(r, 0));

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { source: "fire-and-forget", operation: "test-op" },
    });

    warnSpy.mockRestore();
  });

  it("logs a console.warn with context and error message", async () => {
    const error = new Error("connection timeout");
    const failing = Promise.reject(error);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logFireAndForget(failing, "embedding-generation");

    await new Promise((r) => setTimeout(r, 0));

    expect(warnSpy).toHaveBeenCalledWith(
      "[fire-and-forget] embedding-generation failed:",
      "connection timeout",
    );

    warnSpy.mockRestore();
  });

  it("handles non-Error rejection values", async () => {
    const failing = Promise.reject("plain string error");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logFireAndForget(failing, "test-op");

    await new Promise((r) => setTimeout(r, 0));

    expect(warnSpy).toHaveBeenCalledWith(
      "[fire-and-forget] test-op failed:",
      "plain string error",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith("plain string error", {
      tags: { source: "fire-and-forget", operation: "test-op" },
    });

    warnSpy.mockRestore();
  });

  it("does nothing when the promise resolves", async () => {
    const succeeding = Promise.resolve("ok");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logFireAndForget(succeeding, "test-op");

    await new Promise((r) => setTimeout(r, 0));

    expect(warnSpy).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
