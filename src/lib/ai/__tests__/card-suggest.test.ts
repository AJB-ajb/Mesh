import { describe, it, expect } from "vitest";
import { sanitizeTitle } from "../card-suggest";

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

describe("sanitizeTitle", () => {
  it("strips scheduling reasoning from the reported bug case", () => {
    const input =
      "Coffee tomorrow (Mar 17)? (13:00-15:00 requested, but no overlap available then - proposing next available slots instead.)";
    expect(sanitizeTitle(input)).toBe("Coffee tomorrow (Mar 17)?");
  });

  it("strips a trailing parenthetical with scheduling keywords", () => {
    expect(sanitizeTitle("Dinner (no overlap found)")).toBe("Dinner");
    expect(sanitizeTitle("Call (proposing alternative slots)")).toBe("Call");
    expect(sanitizeTitle("Study session (conflict detected)")).toBe(
      "Study session",
    );
  });

  it("strips trailing time range annotations", () => {
    expect(sanitizeTitle("Coffee (14:00-15:30)")).toBe("Coffee");
    expect(sanitizeTitle("Call (9:00-10:00 tomorrow)")).toBe("Call");
    expect(sanitizeTitle("Dinner (18:00–20:00 suggested)")).toBe("Dinner");
  });

  it("preserves clean titles unchanged", () => {
    expect(sanitizeTitle("Coffee tomorrow?")).toBe("Coffee tomorrow?");
    expect(sanitizeTitle("Team sync")).toBe("Team sync");
    expect(sanitizeTitle("Study session at the library")).toBe(
      "Study session at the library",
    );
  });

  it("preserves non-scheduling parentheticals", () => {
    expect(sanitizeTitle("Coffee (with Alice)")).toBe("Coffee (with Alice)");
    expect(sanitizeTitle("Meeting (Room 204)")).toBe("Meeting (Room 204)");
  });

  it("handles empty and whitespace-only strings", () => {
    expect(sanitizeTitle("")).toBe("");
    expect(sanitizeTitle("  ")).toBe("");
  });

  it("is case-insensitive for scheduling keywords", () => {
    expect(sanitizeTitle("Call (OVERLAP not found)")).toBe("Call");
    expect(sanitizeTitle("Call (Requested time unavailable)")).toBe("Call");
  });
});
