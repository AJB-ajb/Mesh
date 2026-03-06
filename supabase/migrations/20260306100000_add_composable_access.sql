-- Add composable access columns to postings (expand phase)
-- See spec/posting-access.md for the full access model.
-- During transition: write both visibility + in_discover; read in_discover.

-- in_discover: appears in platform-wide Discover feed
ALTER TABLE postings ADD COLUMN IF NOT EXISTS in_discover boolean NOT NULL DEFAULT true;

-- link_token: shareable link token (null = no link created)
ALTER TABLE postings ADD COLUMN IF NOT EXISTS link_token text UNIQUE;

-- Migrate existing data from visibility
UPDATE postings SET in_discover = true  WHERE visibility = 'public';
UPDATE postings SET in_discover = false WHERE visibility = 'private';

-- Index for Discover feed queries
CREATE INDEX IF NOT EXISTS idx_postings_in_discover ON postings (in_discover) WHERE in_discover = true;

-- Index for link lookup
CREATE INDEX IF NOT EXISTS idx_postings_link_token ON postings (link_token) WHERE link_token IS NOT NULL;

-- Update RLS: allow public read of postings with a link_token (for link landing page)
-- The existing RLS policies handle visibility='public'; we add a policy for link access.
CREATE POLICY "Anyone can view postings via link token"
  ON postings FOR SELECT
  USING (link_token IS NOT NULL);
