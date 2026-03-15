import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CardDeadlineBadge } from "../card-deadline-badge";

beforeEach(() => {
  vi.useFakeTimers();
  // Fix "now" to 2026-03-15T12:00:00Z
  vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("CardDeadlineBadge", () => {
  it("shows absolute format when deadline is > 24h away", () => {
    // 3 days from now
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-18T18:00:00Z" />,
    );
    const text = container.textContent;
    // Should show day name and time, not relative
    expect(text).toMatch(/Closes\s+\w{3}/); // "Closes Wed" or similar
    expect(text).not.toMatch(/Closes in/);
  });

  it("shows relative format when deadline is < 24h away", () => {
    // 8 hours from now
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-15T20:00:00Z" />,
    );
    const text = container.textContent;
    expect(text).toMatch(/Closes in 8h/);
  });

  it("shows minutes when deadline is < 1h away", () => {
    // 30 minutes from now
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-15T12:30:00Z" />,
    );
    const text = container.textContent;
    expect(text).toMatch(/Closes in 30m/);
  });

  it("has urgent styling when deadline is < 2h away", () => {
    // 1 hour from now
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-15T13:00:00Z" />,
    );
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.className).toContain("bg-orange-100");
    expect(span!.className).toContain("text-orange-700");
  });

  it("does NOT have urgent styling when deadline is > 2h away", () => {
    // 5 hours from now
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-15T17:00:00Z" />,
    );
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.className).not.toContain("bg-orange-100");
    expect(span!.className).toContain("bg-muted");
  });

  it("renders nothing when deadline has already passed", () => {
    // 1 hour ago
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-15T11:00:00Z" />,
    );
    expect(container.textContent).toBe("");
    expect(container.querySelector("span")).toBeNull();
  });

  it("shows at least 1m even for very close deadlines", () => {
    // 10 seconds from now
    const { container } = render(
      <CardDeadlineBadge deadline="2026-03-15T12:00:10Z" />,
    );
    const text = container.textContent;
    // Math.round(10000/60000) = 0, Math.max(1, 0) = 1
    expect(text).toMatch(/Closes in 1m/);
  });
});
