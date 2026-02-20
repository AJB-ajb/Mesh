-- Invite Redesign: Expand Phase
-- Adds visibility column to postings (parallel to mode), invite_mode and declined_list to friend_asks.
-- The mode column is kept for backward compatibility and will be dropped in a separate contract migration.

-- 1. Add visibility column to postings
ALTER TABLE postings
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public'
  CHECK (visibility IN ('public', 'private'));

-- 2. Backfill visibility from mode
UPDATE postings SET visibility = 'private' WHERE mode = 'friend_ask';
UPDATE postings SET visibility = 'public' WHERE mode = 'open' OR mode IS NULL;

-- 3. Add invite_mode to friend_asks (sequential or parallel)
ALTER TABLE friend_asks
  ADD COLUMN IF NOT EXISTS invite_mode text DEFAULT 'sequential'
  CHECK (invite_mode IN ('sequential', 'parallel'));

-- 4. Add declined_list to friend_asks (tracks who declined in parallel mode)
ALTER TABLE friend_asks
  ADD COLUMN IF NOT EXISTS declined_list uuid[] DEFAULT '{}';

-- 5. Fix friend_asks SELECT RLS policy to allow invitees to read back their own rows
-- The current policy only allows creator_id = auth.uid(), which causes the "coerce to single JSON"
-- error when invitees try to update + select.
DROP POLICY IF EXISTS "Users can view their own friend_asks" ON friend_asks;

CREATE POLICY "Users can view their own friend_asks"
  ON friend_asks FOR SELECT
  USING (
    creator_id = auth.uid()
    OR auth.uid() = ANY(ordered_friend_list)
  );
