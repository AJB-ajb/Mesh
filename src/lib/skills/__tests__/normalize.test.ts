import { describe, it, expect, vi } from "vitest";
import { normalizeSkillString } from "../normalize";

/**
 * Creates a chainable mock that mirrors the Supabase query-builder API.
 * Each method returns `this` so calls like `.select().eq().maybeSingle()` work.
 * The terminal `.maybeSingle()` / `.single()` resolve to `resolveValue`.
 */
function chainable(resolveValue: { data: unknown }) {
  const obj: Record<string, unknown> = {};
  const self = () => obj;

  // Every method returns `this` except terminal ones
  for (const method of [
    "select",
    "ilike",
    "eq",
    "limit",
    "order",
    "delete",
    "update",
  ]) {
    obj[method] = vi.fn().mockReturnValue(obj);
  }

  // Terminal methods resolve the value
  obj.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
  obj.single = vi.fn().mockResolvedValue(resolveValue);

  // upsert is terminal for cache writes — returns void-ish
  obj.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

  // Thenable for alias lookup (`.select("id, name, aliases")` without terminal)
  obj.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolveValue));

  return self;
}

type TableConfig = Record<string, () => Record<string, unknown>>;

/**
 * Creates a mock Supabase client where `from(table)` dispatches
 * to per-table chain builders.
 */
function createMockSupabase(tables: TableConfig) {
  return {
    from: vi.fn((table: string) => {
      const factory = tables[table];
      if (!factory) {
        throw new Error(`Unexpected table: ${table}`);
      }
      return factory();
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("normalizeSkillString", () => {
  it("returns null for empty string", async () => {
    // No DB calls expected — doesn't matter what tables return
    const supabase = createMockSupabase({
      skill_normalization_cache: chainable({ data: null }),
      skill_nodes: chainable({ data: null }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizeSkillString(supabase as any, "");
    expect(result).toBeNull();
    // Verify no DB call was made
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns null for whitespace-only string", async () => {
    const supabase = createMockSupabase({
      skill_normalization_cache: chainable({ data: null }),
      skill_nodes: chainable({ data: null }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizeSkillString(supabase as any, "   ");
    expect(result).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  describe("cache behavior", () => {
    it("returns cached result when cache hit and node exists", async () => {
      const supabase = createMockSupabase({
        skill_normalization_cache: chainable({
          data: { skill_node_id: "cached-id" },
        }),
        skill_nodes: chainable({
          data: { id: "cached-id", name: "Python" },
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await normalizeSkillString(supabase as any, "python");
      expect(result).toEqual({
        nodeId: "cached-id",
        name: "Python",
        created: false,
      });

      // Should have called from() for cache lookup + node verification only
      // (no name match / alias steps)
      const fromCalls = supabase.from.mock.calls.map((c: string[]) => c[0]);
      expect(fromCalls).toEqual(["skill_normalization_cache", "skill_nodes"]);
    });

    it("deletes stale cache entry and falls through to name match", async () => {
      // First call: cache lookup returns a hit
      // Second call: node verification returns null (deleted node)
      // Third call: cache delete
      // Fourth call: name match
      let skillNodeCallCount = 0;
      const supabase = createMockSupabase({
        skill_normalization_cache: (() => {
          let callCount = 0;
          return () => {
            callCount++;
            if (callCount === 1) {
              // cache lookup — returns hit
              return chainable({ data: { skill_node_id: "deleted-id" } })();
            }
            // cache delete — returns void
            return chainable({ data: null })();
          };
        })(),
        skill_nodes: (() => {
          return () => {
            skillNodeCallCount++;
            if (skillNodeCallCount === 1) {
              // node verification — node was deleted
              return chainable({ data: null })();
            }
            if (skillNodeCallCount === 2) {
              // Step 1: name match succeeds
              return chainable({ data: { id: "node-1", name: "React" } })();
            }
            // Step 2+ : alias lookup etc — shouldn't reach
            return chainable({ data: [] })();
          };
        })(),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await normalizeSkillString(supabase as any, "React", {
        useLLM: false,
      });

      expect(result).toEqual({
        nodeId: "node-1",
        name: "React",
        created: false,
      });

      // Verify cache delete was called (the stale entry)
      const fromCalls = supabase.from.mock.calls.map((c: string[]) => c[0]);
      // Expected sequence: cache lookup, node verify, cache delete, name match, cache write
      expect(fromCalls).toContain("skill_normalization_cache");
      expect(
        fromCalls.filter((t: string) => t === "skill_normalization_cache")
          .length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("writes cache entry after name match", async () => {
      const cacheChain = chainable({ data: null });
      const supabase = createMockSupabase({
        skill_normalization_cache: cacheChain,
        skill_nodes: chainable({
          data: { id: "node-1", name: "Python" },
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await normalizeSkillString(supabase as any, "Python", {
        useLLM: false,
      });

      expect(result).toEqual({
        nodeId: "node-1",
        name: "Python",
        created: false,
      });

      // Verify cache write happened (from called with skill_normalization_cache for upsert)
      const fromCalls = supabase.from.mock.calls.map((c: string[]) => c[0]);
      // Should be: cache lookup (miss), name match, cache write
      const cacheCalls = fromCalls.filter(
        (t: string) => t === "skill_normalization_cache",
      );
      expect(cacheCalls.length).toBe(2); // lookup + write
    });
  });

  it("finds exact name match (cache miss)", async () => {
    const supabase = createMockSupabase({
      skill_normalization_cache: chainable({ data: null }), // cache miss
      skill_nodes: chainable({
        data: { id: "node-1", name: "Python" },
      }),
    });

    const result = await normalizeSkillString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "Python",
    );
    expect(result).toEqual({
      nodeId: "node-1",
      name: "Python",
      created: false,
    });
  });

  it("finds alias match when exact match fails (cache miss)", async () => {
    const nodes = [{ id: "node-2", name: "JavaScript", aliases: ["JS", "js"] }];
    let skillNodeCallCount = 0;
    const supabase = createMockSupabase({
      skill_normalization_cache: chainable({ data: null }), // cache miss
      skill_nodes: () => {
        skillNodeCallCount++;
        if (skillNodeCallCount === 1) {
          // Step 1: name match fails
          return chainable({ data: null })();
        }
        // Step 2: alias lookup returns all nodes
        return chainable({ data: nodes })();
      },
    });

    const result = await normalizeSkillString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "JS",
      { useLLM: false },
    );
    expect(result).toEqual({
      nodeId: "node-2",
      name: "JavaScript",
      created: false,
    });
  });

  it("returns null when no match and LLM disabled (cache miss)", async () => {
    let skillNodeCallCount = 0;
    const supabase = createMockSupabase({
      skill_normalization_cache: chainable({ data: null }), // cache miss
      skill_nodes: () => {
        skillNodeCallCount++;
        if (skillNodeCallCount === 1) {
          return chainable({ data: null })(); // name match miss
        }
        return chainable({ data: [] })(); // alias lookup — empty
      },
    });

    const result = await normalizeSkillString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "UnknownSkill123",
      { useLLM: false },
    );
    expect(result).toBeNull();
  });
});
