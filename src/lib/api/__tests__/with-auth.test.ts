// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
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

import {
  withAuth,
  type AuthContext,
  type CronContext,
  type OptionalAuthContext,
} from "../with-auth";

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
    expect(body.error.message).toBe("Internal server error");
  });
});

// ---------------------------------------------------------------------------
// Cron mode
// ---------------------------------------------------------------------------

describe("withAuth cron mode", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, MY_CRON_SECRET: "secret-123" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 when no Authorization header", async () => {
    const handler = vi.fn();
    const wrappedHandler = withAuth(
      { authMode: "cron", cronSecretEnv: "MY_CRON_SECRET" },
      handler,
    );

    const req = new Request("http://localhost/api/cron");
    const response = await wrappedHandler(req, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is wrong", async () => {
    const handler = vi.fn();
    const wrappedHandler = withAuth(
      { authMode: "cron", cronSecretEnv: "MY_CRON_SECRET" },
      handler,
    );

    const req = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const response = await wrappedHandler(req, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with CronContext when secret is correct", async () => {
    const handler = vi.fn(async () => NextResponse.json({ synced: true }));
    const wrappedHandler = withAuth(
      { authMode: "cron", cronSecretEnv: "MY_CRON_SECRET" },
      handler,
    );

    const req = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer secret-123" },
    });
    const response = await wrappedHandler(req, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    // @ts-expect-error - vitest mock type inference issue
    const ctx: CronContext = handler.mock.calls[0][1];
    expect(ctx.supabase).toBeDefined();
    expect(ctx.params).toEqual({});
    // CronContext should NOT have a user property
    expect("user" in ctx).toBe(false);
  });

  it("returns 500 when env var is not set", async () => {
    delete process.env.MY_CRON_SECRET;
    const handler = vi.fn();
    const wrappedHandler = withAuth(
      { authMode: "cron", cronSecretEnv: "MY_CRON_SECRET" },
      handler,
    );

    const req = new Request("http://localhost/api/cron", {
      headers: { Authorization: "Bearer anything" },
    });
    const response = await wrappedHandler(req, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Optional auth mode
// ---------------------------------------------------------------------------

describe("withAuth optional mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("provides user when authenticated", async () => {
    const mockUser = { id: "user-123" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrappedHandler = withAuth({ authMode: "optional" }, handler);

    const req = new Request("http://localhost/api/feedback");
    await wrappedHandler(req, { params: Promise.resolve({}) });

    expect(handler).toHaveBeenCalledTimes(1);
    // @ts-expect-error - vitest mock type inference issue
    const ctx: OptionalAuthContext = handler.mock.calls[0][1];
    expect(ctx.user).toEqual(mockUser);
    expect(ctx.supabase).toBeDefined();
  });

  it("provides null user when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrappedHandler = withAuth({ authMode: "optional" }, handler);

    const req = new Request("http://localhost/api/feedback");
    await wrappedHandler(req, { params: Promise.resolve({}) });

    expect(handler).toHaveBeenCalledTimes(1);
    // @ts-expect-error - vitest mock type inference issue
    const ctx: OptionalAuthContext = handler.mock.calls[0][1];
    expect(ctx.user).toBeNull();
    expect(ctx.supabase).toBeDefined();
  });
});
