// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { PATCH, DELETE } = await import("@/app/api/postings/[id]/route");

function makePatchReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/postings/posting-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? { title: "Updated" }),
  });
}

function makeDeleteReq() {
  return new Request("http://localhost/api/postings/posting-1", {
    method: "DELETE",
  });
}

const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

describe("PATCH /api/postings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(makePatchReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when posting not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await PATCH(makePatchReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the creator", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "posting-1", creator_id: "other-user" },
        error: null,
      }),
    );

    const res = await PATCH(makePatchReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  it("updates posting successfully", async () => {
    authedUser(mockGetUser);

    const fetchChain = buildChain({
      data: { id: "posting-1", creator_id: "user-1" },
      error: null,
    });
    const updateChain = buildChain({
      data: { id: "posting-1", title: "Updated" },
      error: null,
    });
    const deleteChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return fetchChain; // fetch posting
      if (callCount === 2) return updateChain; // update posting
      return deleteChain; // delete+insert skills/windows
    });

    const res = await PATCH(makePatchReq({ title: "Updated" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.posting).toBeDefined();
  });

  it("syncs skills when selectedSkills provided", async () => {
    authedUser(mockGetUser);

    const fetchChain = buildChain({
      data: { id: "posting-1", creator_id: "user-1" },
      error: null,
    });
    const updateChain = buildChain({
      data: { id: "posting-1", title: "Updated" },
      error: null,
    });
    const skillsChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return fetchChain;
      if (callCount === 2) return updateChain;
      return skillsChain;
    });

    const res = await PATCH(
      makePatchReq({
        title: "Updated",
        selectedSkills: [{ skillId: "s1", levelMin: 2 }],
      }),
      routeCtx,
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/postings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await DELETE(makeDeleteReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when posting not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await DELETE(makeDeleteReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the creator", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "posting-1", creator_id: "other-user" },
        error: null,
      }),
    );

    const res = await DELETE(makeDeleteReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  it("deletes posting successfully", async () => {
    authedUser(mockGetUser);

    const fetchChain = buildChain({
      data: { id: "posting-1", creator_id: "user-1" },
      error: null,
    });
    const deleteChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return fetchChain;
      return deleteChain;
    });

    const res = await DELETE(makeDeleteReq(), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
  });
});
