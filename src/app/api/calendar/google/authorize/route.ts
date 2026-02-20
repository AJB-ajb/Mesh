/**
 * GET /api/calendar/google/authorize
 * Initiates Google Calendar OAuth flow.
 * Redirects the user to Google's consent screen.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/calendar/google";
import { apiError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    // Use user ID as state to verify on callback
    const authUrl = buildAuthUrl(user.id);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google authorize error:", error);
    return apiError(
      "INTERNAL",
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
