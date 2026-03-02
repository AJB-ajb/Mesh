/**
 * Lightweight in-memory rate limiter.
 *
 * Pre-launch utility — swap for Redis-backed limiter when scaling.
 * Each limiter instance tracks request counts per user within a
 * sliding window and auto-cleans expired entries on every check.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (present when blocked). */
  retryAfter?: number;
}

export interface RateLimiterOptions {
  /** Maximum requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/**
 * Creates a named rate limiter backed by an in-memory Map.
 *
 * Usage:
 * ```ts
 * const limiter = createRateLimiter("deep-match", { maxRequests: 5, windowMs: 60 * 60 * 1000 });
 * const { allowed, retryAfter } = limiter.check(userId);
 * ```
 */
export function createRateLimiter(_name: string, options: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();

  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }

  function check(userId: string): RateLimitResult {
    cleanup();

    const now = Date.now();
    const existing = store.get(userId);

    // First request or window expired
    if (!existing || now >= existing.resetAt) {
      store.set(userId, { count: 1, resetAt: now + options.windowMs });
      return { allowed: true };
    }

    // Within window — check count
    if (existing.count < options.maxRequests) {
      existing.count += 1;
      return { allowed: true };
    }

    // Rate limited
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { check, /** Exposed for testing. */ _store: store };
}
