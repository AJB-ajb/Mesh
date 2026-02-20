/**
 * Google Calendar integration: OAuth flow + FreeBusy API.
 */

import { google } from "googleapis";
import { encrypt, decrypt } from "./encryption";
import type { BusyBlock, GoogleTokens } from "./types";
import { CALENDAR_SYNC } from "@/lib/constants";

// ---------------------------------------------------------------------------
// OAuth client factory
// ---------------------------------------------------------------------------

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/calendar/google/callback`,
  );
}

// ---------------------------------------------------------------------------
// OAuth URL generation
// ---------------------------------------------------------------------------

/**
 * Build Google OAuth consent URL for calendar.freebusy scope.
 * Uses `access_type=offline` and `prompt=consent` to always get a refresh token.
 */
export function buildAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.freebusy"],
    state,
  });
}

// ---------------------------------------------------------------------------
// Code exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for tokens.
 * Returns encrypted token buffers ready for DB storage.
 */
export async function exchangeCode(code: string): Promise<{
  accessTokenEncrypted: Buffer;
  refreshTokenEncrypted: Buffer;
  expiresAt: Date;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google did not return expected tokens");
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessTokenEncrypted: encrypt(tokens.access_token),
    refreshTokenEncrypted: encrypt(tokens.refresh_token),
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh an access token using a stored refresh token.
 * Returns new encrypted access token + expiry.
 */
export async function refreshAccessToken(
  refreshTokenEncrypted: Buffer,
): Promise<{
  accessTokenEncrypted: Buffer;
  expiresAt: Date;
}> {
  const client = getOAuthClient();
  const refreshToken = decrypt(refreshTokenEncrypted);
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token");
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessTokenEncrypted: encrypt(credentials.access_token),
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Decrypt stored tokens
// ---------------------------------------------------------------------------

/**
 * Decrypt stored token buffers into usable GoogleTokens.
 */
export function decryptTokens(
  accessTokenEncrypted: Buffer,
  refreshTokenEncrypted: Buffer,
  expiresAt: Date,
): GoogleTokens {
  return {
    accessToken: decrypt(accessTokenEncrypted),
    refreshToken: decrypt(refreshTokenEncrypted),
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// FreeBusy API
// ---------------------------------------------------------------------------

/**
 * Fetch free/busy data from Google Calendar for the next N weeks.
 */
export async function fetchFreeBusy(
  accessToken: string,
): Promise<BusyBlock[]> {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: client });
  const now = new Date();
  const horizon = new Date(
    now.getTime() + CALENDAR_SYNC.FREEBUSY_HORIZON_WEEKS * 7 * 24 * 60 * 60 * 1000,
  );

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: horizon.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busyPeriods =
    response.data.calendars?.["primary"]?.busy ?? [];

  return busyPeriods
    .filter(
      (period): period is { start: string; end: string } =>
        !!period.start && !!period.end,
    )
    .map((period) => ({
      start: new Date(period.start),
      end: new Date(period.end),
    }));
}
