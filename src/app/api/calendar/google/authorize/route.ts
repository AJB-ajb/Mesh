/**
 * GET /api/calendar/google/authorize
 * Initiates Google Calendar OAuth flow.
 * Redirects the user to Google's consent screen.
 */

import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, OAUTH_STATE_COOKIE } from "@/lib/calendar/google";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL("/login?next=%2Fsettings", req.url));
    }

    // Build CSRF-safe state: userId:nonce
    const nonce = randomBytes(16).toString("hex");
    const state = `${user.id}:${nonce}`;

    const origin = new URL(req.url).origin;
    const authUrl = buildAuthUrl(state, origin);

    const response = NextResponse.redirect(authUrl);

    // Set httpOnly cookie for CSRF verification in callback
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/calendar/google/callback",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Google authorize error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
