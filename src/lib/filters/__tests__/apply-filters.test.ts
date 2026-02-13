import { describe, it, expect } from "vitest";
import { applyFilters, parseHoursPerWeek } from "../apply-filters";
import type { PostingFilters } from "@/lib/types/filters";

// Sample postings for testing
const samplePostings = [
  {
    id: "1",
    category: "hackathon",
    mode: "open",
    location_mode: "remote",
    location_preference: 1.0,
    location_name: null,
    skills: ["React", "TypeScript", "Node.js"],
    skill_level_min: 5,
    tags: ["web", "frontend"],
    estimated_time: "10-20h/week",
    team_size_min: 2,
    team_size_max: 4,
  },
  {
    id: "2",
    category: "study",
    mode: "friend_ask",
    location_mode: "in_person",
    location_preference: 0.0,
    location_name: "Berlin",
    skills: ["Python", "Machine Learning"],
    skill_level_min: 3,
    tags: ["ai", "data"],
    estimated_time: "5h/week",
    team_size_min: 1,
    team_size_max: 2,
  },
  {
    id: "3",
    category: "professional",
    mode: "open",
    location_mode: "either",
    location_preference: 0.5,
    location_name: "Munich",
    skills: ["Java", "Spring", "React"],
    skill_level_min: 7,
    tags: ["backend", "enterprise"],
    estimated_time: "30h/week",
    team_size_min: 3,
    team_size_max: 8,
  },
  {
    id: "4",
    category: "social",
    mode: "open",
    location_mode: null,
    location_preference: null,
    location_name: null,
    skills: ["Design", "Figma"],
    skill_level_min: null,
    tags: [],
    estimated_time: null,
    team_size_min: 1,
    team_size_max: 1,
  },
];

describe("applyFilters", () => {
  it("returns all postings with empty filters", () => {
    const result = applyFilters(samplePostings, {});
    expect(result).toHaveLength(4);
  });

  describe("category filter", () => {
    it("filters by exact category match", () => {
      const result = applyFilters(samplePostings, { category: "hackathon" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("returns empty for non-matching category", () => {
      const result = applyFilters(samplePostings, { category: "personal" });
      expect(result).toHaveLength(0);
    });
  });

  describe("mode filter", () => {
    it("filters by open mode", () => {
      const result = applyFilters(samplePostings, { mode: "open" });
      expect(result).toHaveLength(3);
    });

    it("filters by friend_ask mode", () => {
      const result = applyFilters(samplePostings, { mode: "friend_ask" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });

  describe("location_mode filter", () => {
    it("filters for remote postings", () => {
      const result = applyFilters(samplePostings, {
        location_mode: "remote",
      });
      expect(result.map((p) => p.id)).toContain("1");
      // posting 4 has no location data, so it passes through
      expect(result.map((p) => p.id)).toContain("4");
    });

    it("filters for in_person postings", () => {
      const result = applyFilters(samplePostings, {
        location_mode: "in_person",
      });
      expect(result.map((p) => p.id)).toContain("2");
    });

    it("'either' passes all postings", () => {
      const result = applyFilters(samplePostings, {
        location_mode: "either",
      });
      expect(result).toHaveLength(4);
    });
  });

  describe("location_name filter", () => {
    it("filters by partial location name match", () => {
      const result = applyFilters(samplePostings, {
        location_name: "berlin",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("is case-insensitive", () => {
      const result = applyFilters(samplePostings, {
        location_name: "MUNICH",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("3");
    });

    it("excludes postings without location_name", () => {
      const result = applyFilters(samplePostings, {
        location_name: "London",
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("skills filter", () => {
    it("filters by skill intersection", () => {
      const result = applyFilters(samplePostings, {
        skills: ["React"],
      });
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(
        expect.arrayContaining(["1", "3"]),
      );
    });

    it("matches any of the filter skills (OR logic)", () => {
      const result = applyFilters(samplePostings, {
        skills: ["Python", "Java"],
      });
      expect(result).toHaveLength(2);
    });

    it("is case-insensitive", () => {
      const result = applyFilters(samplePostings, {
        skills: ["react"],
      });
      expect(result).toHaveLength(2);
    });

    it("returns empty when no skills match", () => {
      const result = applyFilters(samplePostings, {
        skills: ["Rust", "Go"],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("skill_level filter", () => {
    it("filters by minimum skill level", () => {
      const result = applyFilters(samplePostings, {
        skill_level_min: 5,
      });
      // postings with skill_level_min >= 5: posting 1 (5), posting 3 (7)
      // posting 4 has null skill_level_min so it won't be checked
      expect(result.map((p) => p.id)).toEqual(
        expect.arrayContaining(["1", "3", "4"]),
      );
    });

    it("filters by maximum skill level", () => {
      const result = applyFilters(samplePostings, {
        skill_level_max: 4,
      });
      // posting 2 has skill_level_min=3, posting 4 null
      expect(result.map((p) => p.id)).toEqual(
        expect.arrayContaining(["2", "4"]),
      );
    });
  });

  describe("tags filter", () => {
    it("filters by tag intersection", () => {
      const result = applyFilters(samplePostings, {
        tags: ["web"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("excludes postings with empty tags", () => {
      const result = applyFilters(samplePostings, {
        tags: ["frontend"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("is case-insensitive", () => {
      const result = applyFilters(samplePostings, {
        tags: ["AI"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });

  describe("hours_per_week filter", () => {
    it("filters by minimum hours", () => {
      const result = applyFilters(samplePostings, {
        hours_per_week_min: 10,
      });
      // posting 1: 10-20h (max=20 >= 10), posting 3: 30h (30 >= 10)
      // posting 2: 5h (max=5 < 10 → filtered out)
      // posting 4: no estimated_time → passes (best-effort)
      expect(result.map((p) => p.id)).toEqual(
        expect.arrayContaining(["1", "3", "4"]),
      );
      expect(result.map((p) => p.id)).not.toContain("2");
    });

    it("filters by maximum hours", () => {
      const result = applyFilters(samplePostings, {
        hours_per_week_max: 10,
      });
      // posting 1: 10-20h (min=10 <= 10), posting 2: 5h (min=5 <= 10)
      // posting 3: 30h (min=30 > 10 → filtered out)
      expect(result.map((p) => p.id)).toContain("1");
      expect(result.map((p) => p.id)).toContain("2");
      expect(result.map((p) => p.id)).not.toContain("3");
    });
  });

  describe("team_size filter", () => {
    it("filters by minimum team size", () => {
      const result = applyFilters(samplePostings, {
        team_size_min: 3,
      });
      // posting 1: max=4 >= 3, posting 3: max=8 >= 3
      // posting 2: max=2 < 3, posting 4: max=1 < 3
      expect(result.map((p) => p.id)).toEqual(
        expect.arrayContaining(["1", "3"]),
      );
    });

    it("filters by maximum team size", () => {
      const result = applyFilters(samplePostings, {
        team_size_max: 2,
      });
      // posting 2: min=1 <= 2, posting 4: min=1 <= 2
      // posting 1: min=2 <= 2, posting 3: min=3 > 2
      expect(result.map((p) => p.id)).not.toContain("3");
    });
  });

  describe("combined filters", () => {
    it("applies multiple filters together (AND logic)", () => {
      const filters: PostingFilters = {
        mode: "open",
        location_mode: "remote",
        skills: ["React"],
      };
      const result = applyFilters(samplePostings, filters);
      // Must be open, remote, and have React
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("returns empty when no posting matches all criteria", () => {
      const filters: PostingFilters = {
        category: "study",
        location_mode: "remote",
        skills: ["React"],
      };
      const result = applyFilters(samplePostings, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty postings array", () => {
      const result = applyFilters([], { category: "hackathon" });
      expect(result).toHaveLength(0);
    });

    it("preserves original posting types through generic", () => {
      const typed = samplePostings.map((p) => ({ ...p, extra: true }));
      const result = applyFilters(typed, { category: "hackathon" });
      expect(result[0].extra).toBe(true);
    });
  });
});

describe("parseHoursPerWeek", () => {
  it("returns null for null input", () => {
    expect(parseHoursPerWeek(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseHoursPerWeek("")).toBeNull();
  });

  it("parses range format: '10-20h/week'", () => {
    expect(parseHoursPerWeek("10-20h/week")).toEqual({ min: 10, max: 20 });
  });

  it("parses range format: '10-20 hours/week'", () => {
    expect(parseHoursPerWeek("10-20 hours/week")).toEqual({ min: 10, max: 20 });
  });

  it("parses single value: '5h/week'", () => {
    expect(parseHoursPerWeek("5h/week")).toEqual({ min: 5, max: 5 });
  });

  it("parses single value: '30h/week'", () => {
    expect(parseHoursPerWeek("30h/week")).toEqual({ min: 30, max: 30 });
  });

  it("parses format without /week: '10 hours'", () => {
    expect(parseHoursPerWeek("10 hours")).toEqual({ min: 10, max: 10 });
  });

  it("parses shortened format: '5h/w'", () => {
    expect(parseHoursPerWeek("5h/w")).toEqual({ min: 5, max: 5 });
  });

  it("returns null for unparseable string", () => {
    expect(parseHoursPerWeek("flexible")).toBeNull();
  });

  it("handles '2 hours' format", () => {
    expect(parseHoursPerWeek("2 hours")).toEqual({ min: 2, max: 2 });
  });
});
