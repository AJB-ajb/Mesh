-- Add location_mode column to profiles table
-- Replaces the continuous location_preference (0-1) with a discrete toggle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_mode text DEFAULT 'either'
    CHECK (location_mode IN ('remote', 'in_person', 'either'));

COMMENT ON COLUMN public.profiles.location_mode IS 'Location mode: remote, in_person, or either';

-- Migrate existing location_preference data to location_mode
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location_preference'
  ) THEN
    UPDATE public.profiles
      SET location_mode = CASE
        WHEN location_preference >= 0.8 THEN 'remote'
        WHEN location_preference <= 0.2 THEN 'in_person'
        ELSE 'either'
      END
      WHERE location_preference IS NOT NULL AND location_mode = 'either';
  END IF;
END $$;
