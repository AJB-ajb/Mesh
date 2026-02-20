// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/api/trigger-embedding-server", () => ({
  triggerEmbeddingGenerationServer: vi.fn().mockResolvedValue(undefined),
}));

const { PATCH } = await import("@/app/api/profiles/route");

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockResolvedValue(resolveValue);
  chain.insert = vi.fn().mockResolvedValue(resolveValue);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

function makeReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/profiles", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

const routeCtx = { params: Promise.resolve({}) };

describe("PATCH /api/profiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("saves profile successfully", async () => {
    authedUser();
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    const res = await PATCH(
      makeReq({
        fullName: "Test User",
        headline: "Dev",
        bio: "Hello",
        interests: "web, mobile",
        selectedSkills: [{ skillId: "s1", level: 3 }],
        availabilityWindows: [
          { day_of_week: 1, start_minutes: 540, end_minutes: 720 },
        ],
      }),
      routeCtx,
    );

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 500 when upsert fails", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "DB error" } }),
    );

    const res = await PATCH(makeReq({ fullName: "Test" }), routeCtx);
    expect(res.status).toBe(500);
  });

  it("validates coordinates — sends null for invalid", async () => {
    authedUser();

    // Track the upsert call to verify coordinates
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteChain = buildChain({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: upsertMock };
      return deleteChain;
    });

    await PATCH(makeReq({ locationLat: "abc", locationLng: "" }), routeCtx);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        location_lat: null,
        location_lng: null,
      }),
      { onConflict: "user_id" },
    );
  });

  it("triggers embedding generation after save", async () => {
    authedUser();
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    const { triggerEmbeddingGenerationServer } =
      await import("@/lib/api/trigger-embedding-server");

    await PATCH(makeReq({ fullName: "Test" }), routeCtx);
    expect(triggerEmbeddingGenerationServer).toHaveBeenCalled();
  });

  it("clears profile_skills when none selected", async () => {
    authedUser();
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await PATCH(makeReq({ selectedSkills: [] }), routeCtx);

    // delete should be called for profile_skills and availability_windows
    expect(chain.delete).toHaveBeenCalled();
  });
});
