import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock updateSession from supabase middleware
const mockUpdateSession = vi.fn();
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

// Import proxy after mocks are set up
import { proxy } from "@/proxy";
import { ROUTES } from "@/lib/routes";

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

function mockUser() {
  return { id: "user-123", email: "test@example.com" };
}

describe("proxy (route protection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user on protected route to /login with next param", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = createRequest(ROUTES.spaces);
    const response = await proxy(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("next=" + encodeURIComponent(ROUTES.spaces));
  });

  it("redirects unauthenticated user on nested protected route", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = createRequest("/settings/profile");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain(
      "next=" + encodeURIComponent("/settings/profile"),
    );
  });

  it("redirects authenticated user on /login to home", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      response: passthrough,
      user: mockUser(),
    });

    const request = createRequest("/login");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain(ROUTES.home);
  });

  it("redirects authenticated user on /signup to home", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      response: passthrough,
      user: mockUser(),
    });

    const request = createRequest("/signup");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain(ROUTES.home);
  });

  it("allows unauthenticated user on public route (e.g. /)", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = createRequest("/");
    const response = await proxy(request);

    // Should return the passthrough response, not a redirect
    expect(response.status).not.toBe(307);
  });

  it("allows authenticated user on protected route", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      response: passthrough,
      user: mockUser(),
    });

    const request = createRequest(ROUTES.spaces);
    const response = await proxy(request);

    // Should return the passthrough response, not a redirect
    expect(response.status).not.toBe(307);
  });

  it("allows unauthenticated user on /onboarding (not protected)", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = createRequest("/onboarding");
    const response = await proxy(request);

    // /onboarding is intentionally not protected — should pass through
    expect(response.status).not.toBe(307);
  });

  it("allows unauthenticated user on /login", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = createRequest("/login");
    const response = await proxy(request);

    // Unauthenticated on auth route should pass through
    expect(response.status).not.toBe(307);
  });

  it("calls updateSession with the request", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = createRequest("/");
    await proxy(request);

    expect(mockUpdateSession).toHaveBeenCalledWith(request);
  });
});
