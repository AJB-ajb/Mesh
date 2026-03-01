-- Deep match columns for LLM-enhanced matching
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS deep_match_score float,
  ADD COLUMN IF NOT EXISTS deep_match_explanation text,
  ADD COLUMN IF NOT EXISTS deep_match_concerns text,
  ADD COLUMN IF NOT EXISTS deep_match_role text,
  ADD COLUMN IF NOT EXISTS deep_matched_at timestamptz;

ALTER TABLE postings
  ADD COLUMN IF NOT EXISTS identified_roles jsonb;
