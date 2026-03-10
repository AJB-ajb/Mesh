import { it, expect } from "vitest";
import { authedUser, buildChain } from "./supabase-mock";

type RouteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;
type MockFn = ReturnType<typeof import("vitest").vi.fn>;

/**
 * Test that a route returns 401 when the user is not authenticated.
 * Call inside a `describe` block.
 */
export function testRequiresAuth(
  handler: RouteHandler,
  makeReq: () => Request,
  routeCtx: { params: Promise<Record<string, string>> },
  mockGetUser: MockFn,
) {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await handler(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });
}

/**
 * Test that a route returns 404 when the target resource is not found.
 * Uses the standard `buildChain({ data: null, error })` mock by default.
 */
export function testRequiresResource(
  handler: RouteHandler,
  makeReq: () => Request,
  routeCtx: { params: Promise<Record<string, string>> },
  mockGetUser: MockFn,
  mockFrom: MockFn,
) {
  it("returns 404 when resource not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );
    const res = await handler(makeReq(), routeCtx);
    expect(res.status).toBe(404);
  });
}

/**
 * Test that a route returns 403 when the user doesn't own the resource.
 * Accepts a `mockSetup` callback to configure the mock data with mismatched ownership.
 */
export function testRequiresOwnership(
  handler: RouteHandler,
  makeReq: () => Request,
  routeCtx: { params: Promise<Record<string, string>> },
  mockGetUser: MockFn,
  mockSetup: () => void,
) {
  it("returns 403 when user has no access", async () => {
    authedUser(mockGetUser);
    mockSetup();
    const res = await handler(makeReq(), routeCtx);
    expect(res.status).toBe(403);
  });
}
