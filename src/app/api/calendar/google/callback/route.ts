/**
 * GET /api/calendar/google/callback
 * Google OAuth callback: exchanges code for tokens, stores encrypted connection.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, OAUTH_STATE_COOKIE } from "@/lib/calendar/google";

function settingsRedirect(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/settings", req.url);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const response = NextResponse.redirect(url);
  // Always clear the OAuth state cookie on exit
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // User denied consent
  if (errorParam) {
    return settingsRedirect(req, {
      error: "Google Calendar connection was cancelled.",
    });
  }

  // Issue 4: redirect instead of JSON error for missing params
  if (!code || !state) {
    return settingsRedirect(req, {
      error: "Missing authorization parameters. Please try again.",
    });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const response = NextResponse.redirect(
        new URL("/login?next=%2Fsettings", req.url),
      );
      response.cookies.delete(OAUTH_STATE_COOKIE);
      return response;
    }

    // Issue 5: Verify state against httpOnly cookie (CSRF protection)
    const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

    if (!cookieState || cookieState !== state) {
      return settingsRedirect(req, {
        error: "OAuth state mismatch. Please try again.",
      });
    }

    // Verify the user ID embedded in the state matches the authenticated user
    const stateUserId = state.split(":")[0];
    if (stateUserId !== user.id) {
      return settingsRedirect(req, {
        error: "OAuth state mismatch. Please try again.",
      });
    }

    // Exchange code for tokens
    const origin = new URL(req.url).origin;
    const { accessTokenEncrypted, refreshTokenEncrypted, expiresAt } =
      await exchangeCode(code, origin);

    // Issue 1: Use select-then-update/insert instead of upsert (onConflict
    // "profile_id" is not a unique constraint — there can be multiple
    // connections per profile for different providers).
    const { data: existing } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("profile_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const connectionData = {
      access_token_encrypted: accessTokenEncrypted.toString("base64"),
      refresh_token_encrypted: refreshTokenEncrypted.toString("base64"),
      token_expires_at: expiresAt.toISOString(),
      sync_status: "pending" as const,
      sync_error: null,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = existing
      ? await supabase
          .from("calendar_connections")
          .update(connectionData)
          .eq("id", existing.id)
      : await supabase.from("calendar_connections").insert({
          ...connectionData,
          profile_id: user.id,
          provider: "google",
        });

    if (saveError) {
      console.error("Failed to store calendar connection:", saveError);
      return settingsRedirect(req, {
        error: "Failed to save calendar connection.",
      });
    }

    return settingsRedirect(req, {
      success: "Google Calendar connected successfully!",
    });
  } catch (error) {
    console.error("Google callback error:", error);
    return settingsRedirect(req, {
      error: "Failed to connect Google Calendar. Please try again.",
    });
  }
}
