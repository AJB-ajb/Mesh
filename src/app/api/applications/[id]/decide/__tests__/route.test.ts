// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser, mockTables } from "tests/utils/supabase-mock";
import { testRequiresAuth, testRequiresOwnership } from "tests/utils/route-test-helpers";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { PATCH } = await import("@/app/api/applications/[id]/decide/route");

// This test uses a different user ID for the posting owner
const MOCK_USER = { id: "owner-1", email: "a@b.com" };

function makeReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/applications/app-1/decide", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? { status: "accepted" }),
  });
}

const routeCtx = { params: Promise.resolve({ id: "app-1" }) };

describe("PATCH /api/applications/[id]/decide", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(PATCH, makeReq, routeCtx, mockGetUser);

  it("returns 400 for invalid status", async () => {
    authedUser(mockGetUser, MOCK_USER);
    const res = await PATCH(makeReq({ status: "invalid" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when application not found", async () => {
    authedUser(mockGetUser, MOCK_USER);
    mockFrom.mockReturnValue(
      buildChain({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    );
    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  testRequiresOwnership(PATCH, makeReq, routeCtx, mockGetUser, () => {
    mockTables(mockFrom, {
      applications: buildChain({
        data: {
          id: "app-1",
          applicant_id: "user-2",
          posting_id: "posting-1",
          status: "pending",
        },
        error: null,
      }),
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-owner",
          title: "Test",
          team_size_max: 3,
          status: "open",
        },
        error: null,
      }),
    });
  });

  describe("malformed payloads", () => {
    it("returns 400 when body is empty object", async () => {
      authedUser(mockGetUser, MOCK_USER);
      const res = await PATCH(makeReq({}), routeCtx);
      expect(res.status).toBe(400);
    });

    it("returns 400 when status is null", async () => {
      authedUser(mockGetUser, MOCK_USER);
      const res = await PATCH(makeReq({ status: null }), routeCtx);
      expect(res.status).toBe(400);
    });

    it("returns 400 when status is a number", async () => {
      authedUser(mockGetUser, MOCK_USER);
      const res = await PATCH(makeReq({ status: 42 }), routeCtx);
      expect(res.status).toBe(400);
    });

    it("returns 400 when body is invalid JSON", async () => {
      authedUser(mockGetUser, MOCK_USER);
      const req = new Request(
        "http://localhost/api/applications/app-1/decide",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "not json{{",
        },
      );
      const res = await PATCH(req, routeCtx);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION");
    });
  });

  it("accepts application and notifies applicant", async () => {
    authedUser(mockGetUser, MOCK_USER);

    mockTables(mockFrom, {
      applications: [
        buildChain({
          data: {
            id: "app-1",
            applicant_id: "user-2",
            posting_id: "posting-1",
            status: "pending",
          },
          error: null,
        }),
        buildChain({ data: null, error: null }), // update
      ],
      postings: [
        buildChain({
          data: {
            id: "posting-1",
            creator_id: "owner-1",
            title: "Test Posting",
            team_size_max: 3,
            status: "open",
          },
          error: null,
        }),
        buildChain({ data: null, error: null, count: 1 }), // fulfillment check
      ],
      profiles: buildChain({
        data: { notification_preferences: null },
        error: null,
      }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await PATCH(makeReq({ status: "accepted" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.application.status).toBe("accepted");
  });

  it("rejects application and notifies applicant", async () => {
    authedUser(mockGetUser, MOCK_USER);

    mockTables(mockFrom, {
      applications: [
        buildChain({
          data: {
            id: "app-1",
            applicant_id: "user-2",
            posting_id: "posting-1",
            status: "pending",
          },
          error: null,
        }),
        buildChain({ data: null, error: null }), // update
      ],
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "owner-1",
          title: "Test Posting",
          team_size_max: 3,
          status: "open",
        },
        error: null,
      }),
      profiles: buildChain({
        data: { notification_preferences: null },
        error: null,
      }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await PATCH(makeReq({ status: "rejected" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.application.status).toBe("rejected");
  });

  it("returns 404 when posting lookup fails after application found", async () => {
    authedUser(mockGetUser, MOCK_USER);

    mockTables(mockFrom, {
      applications: buildChain({
        data: {
          id: "app-1",
          applicant_id: "user-2",
          posting_id: "posting-1",
          status: "pending",
        },
        error: null,
      }),
      postings: buildChain({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    });

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(404);
  });
});
