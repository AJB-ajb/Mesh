import { describe, it, expect } from "vitest";
import { applyVoteToOptions } from "../use-space-cards";
import type { CardOption } from "@/lib/supabase/types";

const USER = "user-1";
const OTHER = "user-2";

function opts(...specs: [string, string[]][]): CardOption[] {
  return specs.map(([label, votes]) => ({ label, votes }));
}

describe("applyVoteToOptions", () => {
  describe("single-select (poll, rsvp, location, task_claim)", () => {
    it("adds vote to unvoted option", () => {
      const options = opts(["A", []], ["B", []]);
      const result = applyVoteToOptions(options, 0, USER, false);
      expect(result[0].votes).toEqual([USER]);
      expect(result[1].votes).toEqual([]);
    });

    it("toggles off when clicking already-voted option", () => {
      const options = opts(["A", [USER]], ["B", []]);
      const result = applyVoteToOptions(options, 0, USER, false);
      expect(result[0].votes).toEqual([]);
    });

    it("switches vote from one option to another", () => {
      const options = opts(["A", [USER]], ["B", []]);
      const result = applyVoteToOptions(options, 1, USER, false);
      expect(result[0].votes).toEqual([]);
      expect(result[1].votes).toEqual([USER]);
    });

    it("preserves other users' votes", () => {
      const options = opts(["A", [OTHER]], ["B", [USER]]);
      const result = applyVoteToOptions(options, 0, USER, false);
      expect(result[0].votes).toEqual([OTHER, USER]);
      expect(result[1].votes).toEqual([]);
    });

    it("does not mutate the original array", () => {
      const options = opts(["A", [USER]], ["B", []]);
      const original = JSON.parse(JSON.stringify(options));
      applyVoteToOptions(options, 1, USER, false);
      expect(options).toEqual(original);
    });
  });

  describe("multi-select (time_proposal)", () => {
    it("adds vote without removing from other options", () => {
      const options = opts(["Mon", [USER]], ["Tue", []], ["Wed", []]);
      const result = applyVoteToOptions(options, 1, USER, true);
      expect(result[0].votes).toEqual([USER]);
      expect(result[1].votes).toEqual([USER]);
    });

    it("toggles off a single option in multi-select", () => {
      const options = opts(["Mon", [USER]], ["Tue", [USER]]);
      const result = applyVoteToOptions(options, 0, USER, true);
      expect(result[0].votes).toEqual([]);
      expect(result[1].votes).toEqual([USER]);
    });
  });
});
