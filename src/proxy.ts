import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Protected routes require an authenticated user.
 * Unauthenticated visitors are redirected to /login with a ?next= param.
 *
 * Note: /onboarding is intentionally NOT protected — users reach it pre-profile.
 */
const PROTECTED_ROUTES = [
  "/posts",
  "/discover",
  "/connections",
  "/settings",
  "/profile",
  "/postings",
  "/my-postings",
  "/active",
];
const AUTH_ROUTES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/active", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /_next/* (Next.js internals)
     * - /api/* (API routes)
     * - /callback (OAuth callback)
     * - /monitoring (Sentry tunnel)
     * - Static assets (images, fonts, sw.js, favicon)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api|callback|monitoring|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|otf)$).*)",
  ],
};
