-- Add source_text and undo columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source_text text,
  ADD COLUMN IF NOT EXISTS previous_source_text text,
  ADD COLUMN IF NOT EXISTS previous_profile_snapshot jsonb;

COMMENT ON COLUMN public.profiles.source_text IS 'Free-form text description that profile fields are derived from';
COMMENT ON COLUMN public.profiles.previous_source_text IS 'Previous source_text for single-level undo';
COMMENT ON COLUMN public.profiles.previous_profile_snapshot IS 'Previous profile field values (JSON) for single-level undo';
