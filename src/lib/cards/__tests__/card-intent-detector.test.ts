import { describe, expect, it } from "vitest";
import { detectCardIntent } from "../card-intent-detector";

describe("detectCardIntent", () => {
  it("detects time scheduling question", () => {
    const result = detectCardIntent("dinner friday?");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes[0]).toBe("time_proposal");
    expect(result.plausibleTypes).toContain("rsvp");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("detects specific time (declarative)", () => {
    const result = detectCardIntent("let's meet at 2pm tomorrow");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes[0]).toBe("rsvp");
    expect(result.plausibleTypes).toContain("time_proposal");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("detects poll with comma/or-separated options", () => {
    const result = detectCardIntent("Italian, sushi, or Thai?");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes).toContain("poll");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("detects task claim intent", () => {
    const result = detectCardIntent("who wants to do frontend?");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes).toContain("task_claim");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("detects location question as poll", () => {
    const result = detectCardIntent("where should we meet?");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes).toContain("poll");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("returns no intent for casual text", () => {
    const result = detectCardIntent("haha that's funny");
    expect(result.hasIntent).toBe(false);
    expect(result.plausibleTypes).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it("returns no intent for short text", () => {
    const result = detectCardIntent("ok");
    expect(result.hasIntent).toBe(false);
    expect(result.plausibleTypes).toHaveLength(0);
  });

  it("detects mixed time + options", () => {
    const result = detectCardIntent("when should we do Italian or sushi?");
    expect(result.hasIntent).toBe(true);
    // Should have both time-related and poll types
    expect(result.plausibleTypes.length).toBeGreaterThanOrEqual(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("detects declarative plan with specific time", () => {
    const result = detectCardIntent("let's do dinner friday at 7pm");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes[0]).toBe("rsvp");
    expect(result.plausibleTypes).toContain("time_proposal");
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("returns no intent for emoji-only messages", () => {
    const result = detectCardIntent("😂😂😂");
    expect(result.hasIntent).toBe(false);
  });

  it("limits plausible types to 3", () => {
    const result = detectCardIntent(
      "when should we do Italian, sushi, or Thai? who wants to volunteer?",
    );
    expect(result.plausibleTypes.length).toBeLessThanOrEqual(3);
  });

  it("is case-insensitive", () => {
    const result = detectCardIntent("DINNER FRIDAY?");
    expect(result.hasIntent).toBe(true);
    expect(result.plausibleTypes).toContain("time_proposal");
  });

  it("does not false-positive on sentences with commas", () => {
    const result = detectCardIntent(
      "Hey, I was thinking, maybe we should leave soon?",
    );
    // Should not detect as poll just because of commas
    expect(result.plausibleTypes).not.toContain("poll");
  });

  it("returns no intent for whitespace-only text", () => {
    const result = detectCardIntent("     ");
    expect(result.hasIntent).toBe(false);
  });
});
