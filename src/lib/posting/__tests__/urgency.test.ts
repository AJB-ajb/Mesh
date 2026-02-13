import { describe, it, expect, vi, afterEach } from "vitest";
import { getUrgencyBadge } from "../urgency";

describe("getUrgencyBadge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns none when expiresAt is null", () => {
    const result = getUrgencyBadge(null);
    expect(result.level).toBe("none");
    expect(result.variant).toBeNull();
  });

  it("returns none when expiresAt is undefined", () => {
    const result = getUrgencyBadge(undefined);
    expect(result.level).toBe("none");
    expect(result.variant).toBeNull();
  });

  it("returns none when already expired", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = getUrgencyBadge(past);
    expect(result.level).toBe("none");
    expect(result.variant).toBeNull();
  });

  it("returns critical (red) when <24h remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // 10 hours from now
    const result = getUrgencyBadge("2025-06-01T22:00:00Z");
    expect(result.level).toBe("critical");
    expect(result.variant).toBe("destructive");
    expect(result.label).toBe("10h left");
  });

  it("returns critical with '<1h left' for very short time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // 30 minutes from now
    const result = getUrgencyBadge("2025-06-01T12:30:00Z");
    expect(result.level).toBe("critical");
    expect(result.variant).toBe("destructive");
    expect(result.label).toBe("<1h left");
  });

  it("returns high (orange) when <3 days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // 2 days from now
    const result = getUrgencyBadge("2025-06-03T12:00:00Z");
    expect(result.level).toBe("high");
    expect(result.variant).toBe("warning");
    expect(result.label).toBe("2d left");
  });

  it("returns medium (yellow) when <7 days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // 5 days from now
    const result = getUrgencyBadge("2025-06-06T12:00:00Z");
    expect(result.level).toBe("medium");
    expect(result.variant).toBe("outline");
    expect(result.label).toBe("5d left");
  });

  it("returns none when >7 days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // 30 days from now
    const result = getUrgencyBadge("2025-07-01T12:00:00Z");
    expect(result.level).toBe("none");
    expect(result.variant).toBeNull();
    expect(result.label).toBe("");
  });

  it("returns high at exactly 24h boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // Exactly 24 hours = 1 day remaining → should be "high" (>= 24h)
    const result = getUrgencyBadge("2025-06-02T12:00:00Z");
    expect(result.level).toBe("high");
    expect(result.variant).toBe("warning");
  });

  it("returns medium at exactly 3 days boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // Exactly 3 days → should be "medium" (>= 3 days)
    const result = getUrgencyBadge("2025-06-04T12:00:00Z");
    expect(result.level).toBe("medium");
    expect(result.variant).toBe("outline");
  });

  it("returns none at exactly 7 days boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    // Exactly 7 days → should be "none" (>= 7 days)
    const result = getUrgencyBadge("2025-06-08T12:00:00Z");
    expect(result.level).toBe("none");
    expect(result.variant).toBeNull();
  });
});
