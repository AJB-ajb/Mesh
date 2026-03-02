// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const limiter = createRateLimiter("test", {
      maxRequests: 3,
      windowMs: 60_000,
    });

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = createRateLimiter("test", {
      maxRequests: 2,
      windowMs: 60_000,
    });

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);

    const result = limiter.check("user-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("returns retryAfter in seconds", () => {
    const limiter = createRateLimiter("test", {
      maxRequests: 1,
      windowMs: 60_000,
    });

    limiter.check("user-1");
    const result = limiter.check("user-1");

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });

  it("resets the window after expiry", () => {
    const limiter = createRateLimiter("test", {
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("tracks users independently", () => {
    const limiter = createRateLimiter("test", {
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);

    // Different user should be unaffected
    expect(limiter.check("user-2").allowed).toBe(true);
  });

  it("cleans up expired entries on each check", () => {
    const limiter = createRateLimiter("test", {
      maxRequests: 1,
      windowMs: 10_000,
    });

    limiter.check("user-1");
    limiter.check("user-2");

    expect(limiter._store.size).toBe(2);

    // Advance past the window and trigger cleanup via a new check
    vi.advanceTimersByTime(10_001);
    limiter.check("user-3");

    // user-1 and user-2 entries should have been cleaned up
    expect(limiter._store.has("user-1")).toBe(false);
    expect(limiter._store.has("user-2")).toBe(false);
    expect(limiter._store.has("user-3")).toBe(true);
    expect(limiter._store.size).toBe(1);
  });
});
