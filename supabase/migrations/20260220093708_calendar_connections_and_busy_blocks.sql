-- Migration: Calendar Connections & Busy Blocks (Phases 3-4)
-- 1. calendar_connections table (Google OAuth + iCal)
-- 2. calendar_busy_blocks table with canonical_ranges
-- 3. RLS policies
-- 4. profiles.calendar_visibility column

-- ============================================
-- 1. calendar_connections table
-- ============================================

CREATE TABLE calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'ical')),
  -- Google OAuth (encrypted at app level, stored as bytea)
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  token_expires_at timestamptz,
  -- iCal
  ical_url text,
  -- Google Watch
  watch_channel_id text,
  watch_resource_id text,
  watch_expiration timestamptz,
  -- Sync metadata
  last_synced_at timestamptz,
  sync_status text NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE calendar_connections IS 'External calendar connections (Google Calendar, iCal feeds) for availability sync.';

-- One Google connection per profile
CREATE UNIQUE INDEX idx_calendar_connections_google_unique
  ON calendar_connections (profile_id) WHERE provider = 'google';

CREATE INDEX idx_calendar_connections_profile_id
  ON calendar_connections (profile_id);

-- ============================================
-- 2. calendar_busy_blocks table
-- ============================================

CREATE TABLE calendar_busy_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  -- Canonical week projection for scoring (computed at sync time)
  canonical_ranges int4range[],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

COMMENT ON TABLE calendar_busy_blocks IS 'Busy time blocks imported from external calendars. Replaced on each sync cycle.';

CREATE INDEX idx_calendar_busy_blocks_profile_id
  ON calendar_busy_blocks (profile_id);

CREATE INDEX idx_calendar_busy_blocks_connection_id
  ON calendar_busy_blocks (connection_id);

-- GiST index on canonical_ranges for overlap queries
CREATE INDEX idx_calendar_busy_blocks_canonical_ranges
  ON calendar_busy_blocks USING gin (canonical_ranges);

-- ============================================
-- 3. RLS Policies
-- ============================================

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own connections
CREATE POLICY "Users can read own calendar connections"
  ON calendar_connections FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Users can insert their own connections
CREATE POLICY "Users can insert own calendar connections"
  ON calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Users can update their own connections
CREATE POLICY "Users can update own calendar connections"
  ON calendar_connections FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Users can delete their own connections
CREATE POLICY "Users can delete own calendar connections"
  ON calendar_connections FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

ALTER TABLE calendar_busy_blocks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read busy blocks (needed for matching/scoring)
CREATE POLICY "Authenticated users can read busy blocks"
  ON calendar_busy_blocks FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own busy blocks
CREATE POLICY "Users can insert own busy blocks"
  ON calendar_busy_blocks FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Users can delete their own busy blocks
CREATE POLICY "Users can delete own busy blocks"
  ON calendar_busy_blocks FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- ============================================
-- 4. profiles.calendar_visibility column
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calendar_visibility text
  NOT NULL DEFAULT 'match_only'
  CHECK (calendar_visibility IN ('match_only', 'team_visible'));
