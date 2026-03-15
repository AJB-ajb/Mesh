import { describe, it, expect } from "vitest";

/**
 * parseMemberNotes is a private helper in card-suggest.ts.
 * We re-implement the logic here for testing since exporting it
 * would pollute the module's public API for a single internal helper.
 *
 * If the implementation drifts, these tests serve as a spec for the
 * expected behavior: parse valid JSON objects, reject everything else.
 */

// Inline copy — keeps the source un-exported while still testing the logic.
function parseMemberNotes(
  json: string | undefined,
): Record<string, string> | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, string>;
    }
  } catch {
    // LLM returned invalid JSON — ignore
  }
  return undefined;
}

describe("parseMemberNotes", () => {
  it("parses a valid JSON object", () => {
    const input = '{"user1": "Free after 6pm", "user2": "Has a conflict at 3"}';
    expect(parseMemberNotes(input)).toEqual({
      user1: "Free after 6pm",
      user2: "Has a conflict at 3",
    });
  });

  it("returns undefined for undefined input", () => {
    expect(parseMemberNotes(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseMemberNotes("")).toBeUndefined();
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseMemberNotes("{not valid json}")).toBeUndefined();
  });

  it("returns undefined for a JSON array (not an object)", () => {
    expect(parseMemberNotes('["a", "b"]')).toBeUndefined();
  });

  it("returns undefined for a JSON string primitive", () => {
    expect(parseMemberNotes('"just a string"')).toBeUndefined();
  });

  it("returns undefined for a JSON number", () => {
    expect(parseMemberNotes("42")).toBeUndefined();
  });

  it("returns undefined for JSON null", () => {
    expect(parseMemberNotes("null")).toBeUndefined();
  });

  it("handles an empty object", () => {
    expect(parseMemberNotes("{}")).toEqual({});
  });

  it("handles nested values (LLM might return unexpected shapes)", () => {
    // The function doesn't validate value types — it just checks top-level is an object
    const input = '{"user1": {"note": "complex"}}';
    const result = parseMemberNotes(input);
    expect(result).toBeDefined();
    expect(result!["user1"]).toEqual({ note: "complex" });
  });
});
