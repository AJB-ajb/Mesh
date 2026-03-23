-- =============================================================================
-- Space Archiving — auto-archive inactive spaces
-- =============================================================================

-- Add archived_at column to spaces
ALTER TABLE spaces
  ADD COLUMN archived_at timestamptz DEFAULT NULL;

-- Index for archived/active filtering
CREATE INDEX idx_spaces_archived ON spaces (archived_at)
  WHERE archived_at IS NOT NULL;

-- RPC: archive a space (admin only, enforced in app layer)
CREATE OR REPLACE FUNCTION archive_space(p_space_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE spaces
    SET archived_at = now()
    WHERE id = p_space_id
      AND archived_at IS NULL;
$$;

-- RPC: unarchive a space
CREATE OR REPLACE FUNCTION unarchive_space(p_space_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE spaces
    SET archived_at = NULL
    WHERE id = p_space_id
      AND archived_at IS NOT NULL;
$$;
