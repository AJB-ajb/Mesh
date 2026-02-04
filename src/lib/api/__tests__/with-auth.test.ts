// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

import { withAuth, type AuthContext } from "../with-auth";

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);

    const req = new Request("http://localhost/api/test");
    const response = await wrappedHandler(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when getUser returns error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Token expired" },
    });

    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);

    const req = new Request("http://localhost/api/test");
    const response = await wrappedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes user and supabase to handler when authenticated", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrappedHandler = withAuth(handler);

    const req = new Request("http://localhost/api/test");
    await wrappedHandler(req, { params: Promise.resolve({}) });

    expect(handler).toHaveBeenCalledTimes(1);
    // @ts-expect-error - vitest mock type inference issue
    const ctx: AuthContext = handler.mock.calls[0][1];
    expect(ctx.user).toEqual(mockUser);
    expect(ctx.supabase).toBeDefined();
    expect(ctx.supabase.auth.getUser).toBeDefined();
  });

  it("resolves route params from Promise", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrappedHandler = withAuth(handler);

    const req = new Request("http://localhost/api/matches/abc-123");
    await wrappedHandler(req, {
      params: Promise.resolve({ id: "abc-123" }),
    });

    // @ts-expect-error - vitest mock type inference issue
    const ctx: AuthContext = handler.mock.calls[0][1];
    expect(ctx.params).toEqual({ id: "abc-123" });
  });

  it("handles empty params when no route context provided", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrappedHandler = withAuth(handler);

    const req = new Request("http://localhost/api/test");
    await wrappedHandler(req, { params: Promise.resolve({}) });

    // @ts-expect-error - vitest mock type inference issue
    const ctx: AuthContext = handler.mock.calls[0][1];
    expect(ctx.params).toEqual({});
  });

  it("catches handler errors and returns 500", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const handler = vi.fn(async () => {
      throw new Error("Database connection failed");
    });
    const wrappedHandler = withAuth(handler);

    const req = new Request("http://localhost/api/test");
    const response = await wrappedHandler(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).toBe("Database connection failed");
  });
});
