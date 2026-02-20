/**
 * GET /api/calendar/google/callback
 * Google OAuth callback: exchanges code for tokens, stores encrypted connection.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode } from "@/lib/calendar/google";
import { apiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // User denied consent
  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("Google Calendar connection was cancelled.")}`,
        req.url,
      ),
    );
  }

  if (!code || !state) {
    return apiError("VALIDATION", "Missing code or state parameter", 400);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL(
          `/login?next=${encodeURIComponent("/settings")}`,
          req.url,
        ),
      );
    }

    // Verify state matches authenticated user
    if (state !== user.id) {
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("OAuth state mismatch. Please try again.")}`,
          req.url,
        ),
      );
    }

    // Exchange code for tokens
    const { accessTokenEncrypted, refreshTokenEncrypted, expiresAt } =
      await exchangeCode(code);

    // Upsert calendar connection (one Google connection per profile)
    const { error: upsertError } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          profile_id: user.id,
          provider: "google",
          access_token_encrypted: accessTokenEncrypted.toString("base64"),
          refresh_token_encrypted: refreshTokenEncrypted.toString("base64"),
          token_expires_at: expiresAt.toISOString(),
          sync_status: "pending",
          sync_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id", ignoreDuplicates: false },
      );

    if (upsertError) {
      console.error("Failed to store calendar connection:", upsertError);
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Failed to save calendar connection.")}`,
          req.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        `/settings?success=${encodeURIComponent("Google Calendar connected successfully!")}`,
        req.url,
      ),
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("Failed to connect Google Calendar. Please try again.")}`,
        req.url,
      ),
    );
  }
}
