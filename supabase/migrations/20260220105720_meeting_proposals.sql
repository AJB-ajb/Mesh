-- Migration: Meeting proposals and team scheduling (Phase 5)
-- 1. meeting_proposals table
-- 2. meeting_responses table
-- 3. RLS policies
-- 4. Helper function: get_posting_team_member_ids()
-- 5. Common availability function: get_team_common_availability()
-- 6. Realtime publication

-- ============================================
-- 1. meeting_proposals
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_proposals_posting ON meeting_proposals (posting_id);
CREATE INDEX idx_meeting_proposals_status ON meeting_proposals (posting_id, status);

-- ============================================
-- 2. meeting_responses
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES meeting_proposals(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('available', 'unavailable')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, responder_id)
);

CREATE INDEX idx_meeting_responses_proposal ON meeting_responses (proposal_id);

-- ============================================
-- 3. RLS policies
-- ============================================

ALTER TABLE meeting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_responses ENABLE ROW LEVEL SECURITY;

-- Helper: check team membership (posting creator + accepted applicants)
CREATE OR REPLACE FUNCTION is_posting_team_member(p_posting_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM postings WHERE id = p_posting_id AND creator_id = p_user_id
    UNION ALL
    SELECT 1 FROM applications
      WHERE posting_id = p_posting_id
        AND applicant_id = p_user_id
        AND status = 'accepted'
  );
$$;

-- meeting_proposals: SELECT for team members
CREATE POLICY "Team members can view proposals"
  ON meeting_proposals FOR SELECT
  USING (is_posting_team_member(posting_id, auth.uid()));

-- meeting_proposals: INSERT for posting owner only
CREATE POLICY "Posting owner can create proposals"
  ON meeting_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM postings
      WHERE id = posting_id AND creator_id = auth.uid()
    )
    AND proposed_by = auth.uid()
  );

-- meeting_proposals: UPDATE for posting owner only (status changes)
CREATE POLICY "Posting owner can update proposals"
  ON meeting_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM postings
      WHERE id = posting_id AND creator_id = auth.uid()
    )
  );

-- meeting_responses: SELECT for team members
CREATE POLICY "Team members can view responses"
  ON meeting_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meeting_proposals mp
      WHERE mp.id = proposal_id
        AND is_posting_team_member(mp.posting_id, auth.uid())
    )
  );

-- meeting_responses: INSERT own response for team members
CREATE POLICY "Team members can submit own response"
  ON meeting_responses FOR INSERT
  WITH CHECK (
    responder_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meeting_proposals mp
      WHERE mp.id = proposal_id
        AND is_posting_team_member(mp.posting_id, auth.uid())
    )
  );

-- meeting_responses: UPDATE own response
CREATE POLICY "Team members can update own response"
  ON meeting_responses FOR UPDATE
  USING (responder_id = auth.uid());

-- ============================================
-- 4. get_posting_team_member_ids()
-- ============================================

CREATE OR REPLACE FUNCTION get_posting_team_member_ids(p_posting_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT array_agg(member_id)
  FROM (
    SELECT creator_id AS member_id
    FROM postings
    WHERE id = p_posting_id
    UNION
    SELECT applicant_id AS member_id
    FROM applications
    WHERE posting_id = p_posting_id AND status = 'accepted'
  ) t;
$$;

COMMENT ON FUNCTION get_posting_team_member_ids IS
  'Returns array of user IDs for a posting team (creator + accepted applicants).';

-- ============================================
-- 5. get_team_common_availability()
-- ============================================
-- Given an array of profile IDs, returns 15-minute time windows
-- where NO member is blocked (using get_effective_blocked_ranges per member).
-- Returns windows as (day_of_week, start_minutes, end_minutes).

CREATE OR REPLACE FUNCTION get_team_common_availability(p_profile_ids uuid[])
RETURNS TABLE (day_of_week int, start_minutes int, end_minutes int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  slot_size CONSTANT int := 15; -- 15-minute slots
  d int;
  slot_start int;
  slot_range int4range;
  is_free boolean;
  run_start int;
  in_run boolean;
BEGIN
  -- For each day of week (0=Mon..6=Sun)
  FOR d IN 0..6 LOOP
    run_start := 0;
    in_run := false;

    -- Walk through every 15-minute slot in the day
    FOR slot_start IN 0..1425 BY slot_size LOOP
      -- Build the canonical range for this slot
      slot_range := int4range(d * 1440 + slot_start, d * 1440 + slot_start + slot_size);

      -- Check if ANY member is blocked during this slot
      SELECT NOT EXISTS (
        SELECT 1
        FROM unnest(p_profile_ids) AS pid(id)
        WHERE EXISTS (
          SELECT 1
          FROM get_effective_blocked_ranges(pid.id) ebr
          WHERE ebr.blocked_range && slot_range
        )
      ) INTO is_free;

      IF is_free THEN
        IF NOT in_run THEN
          run_start := slot_start;
          in_run := true;
        END IF;
      ELSE
        IF in_run THEN
          day_of_week := d;
          start_minutes := run_start;
          end_minutes := slot_start;
          RETURN NEXT;
          in_run := false;
        END IF;
      END IF;
    END LOOP;

    -- Close any open run at end of day
    IF in_run THEN
      day_of_week := d;
      start_minutes := run_start;
      end_minutes := 1440;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION get_team_common_availability IS
  'Returns 15-min windows where no team member is blocked, per day of week.';

-- ============================================
-- 6. Realtime publication
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE meeting_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_responses;
