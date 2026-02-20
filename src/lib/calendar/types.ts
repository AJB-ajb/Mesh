/**
 * Types for calendar sync (Google Calendar + iCal).
 */

export type CalendarProvider = "google" | "ical";

export type CalendarSyncStatus = "pending" | "syncing" | "synced" | "error";

export type CalendarVisibility = "match_only" | "team_visible";

/** Database row shape for calendar_connections */
export type CalendarConnectionRow = {
  id: string;
  profile_id: string;
  provider: CalendarProvider;
  access_token_encrypted: string | null; // base64 of bytea
  refresh_token_encrypted: string | null; // base64 of bytea
  token_expires_at: string | null;
  ical_url: string | null;
  watch_channel_id: string | null;
  watch_resource_id: string | null;
  watch_expiration: string | null;
  last_synced_at: string | null;
  sync_status: CalendarSyncStatus;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
};

/** Public-facing connection info (no tokens) */
export type CalendarConnection = {
  id: string;
  provider: CalendarProvider;
  lastSyncedAt: string | null;
  syncStatus: CalendarSyncStatus;
  syncError: string | null;
  icalUrl: string | null;
  createdAt: string;
};

/** Database row shape for calendar_busy_blocks */
export type CalendarBusyBlockRow = {
  id: string;
  connection_id: string;
  profile_id: string;
  start_time: string;
  end_time: string;
  canonical_ranges: string[] | null; // PostgreSQL int4range[] serialized
  created_at: string;
};

/** A busy time period from an external calendar */
export type BusyBlock = {
  start: Date;
  end: Date;
};

/** Google OAuth tokens (decrypted, in-memory only) */
export type GoogleTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

/** Parse a CalendarConnectionRow into a CalendarConnection (public view) */
export function toCalendarConnection(
  row: CalendarConnectionRow,
): CalendarConnection {
  return {
    id: row.id,
    provider: row.provider,
    lastSyncedAt: row.last_synced_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    icalUrl: row.ical_url,
    createdAt: row.created_at,
  };
}
