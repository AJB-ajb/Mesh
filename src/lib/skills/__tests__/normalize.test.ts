import { describe, it, expect, vi } from "vitest";
import { normalizeSkillString } from "../normalize";

// Minimal mock for SupabaseClient
function createMockSupabase(
  nodes: Array<{ id: string; name: string; aliases?: string[] }>,
) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(async () => {
              // Find exact name match (case-insensitive)
              const match = nodes.find(
                (n) => n.name.toLowerCase() === "python",
              );
              return { data: match || null };
            }),
          }),
        }),
        // For alias lookup (returns all nodes)
        then: vi.fn((resolve: (v: unknown) => void) =>
          resolve({
            data: nodes.map((n) => ({
              ...n,
              aliases: n.aliases ?? [],
            })),
          }),
        ),
      }),
    }),
  };
}

describe("normalizeSkillString", () => {
  it("returns null for empty string", async () => {
    const supabase = createMockSupabase([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizeSkillString(supabase as any, "");
    expect(result).toBeNull();
  });

  it("returns null for whitespace-only string", async () => {
    const supabase = createMockSupabase([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizeSkillString(supabase as any, "   ");
    expect(result).toBeNull();
  });

  it("finds exact name match", async () => {
    const nodes = [{ id: "node-1", name: "Python" }];
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: nodes[0] }),
            }),
          }),
        }),
      }),
    };

    const result = await normalizeSkillString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSupabase as any,
      "Python",
    );
    expect(result).toEqual({
      nodeId: "node-1",
      name: "Python",
      created: false,
    });
  });

  it("finds alias match when exact match fails", async () => {
    const nodes = [{ id: "node-2", name: "JavaScript", aliases: ["JS", "js"] }];
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          // For the full node fetch (alias lookup), resolve with data
          then: vi.fn((resolve: (v: unknown) => void) =>
            resolve({ data: nodes }),
          ),
        }),
      }),
    };

    const result = await normalizeSkillString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSupabase as any,
      "JS",
      { useLLM: false },
    );
    expect(result).toEqual({
      nodeId: "node-2",
      name: "JavaScript",
      created: false,
    });
  });

  it("returns null when no match and LLM disabled", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [] })),
        }),
      }),
    };

    const result = await normalizeSkillString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSupabase as any,
      "UnknownSkill123",
      { useLLM: false },
    );
    expect(result).toBeNull();
  });
});
