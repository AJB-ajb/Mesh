-- Add concurrent_invites to friend_asks (how many invites outstanding at once in sequential mode)
ALTER TABLE friend_asks ADD COLUMN IF NOT EXISTS concurrent_invites integer NOT NULL DEFAULT 1;

-- Add pending_invitees to track who currently has outstanding invites
ALTER TABLE friend_asks ADD COLUMN IF NOT EXISTS pending_invitees uuid[] NOT NULL DEFAULT '{}';
