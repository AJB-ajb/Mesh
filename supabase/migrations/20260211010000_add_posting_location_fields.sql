-- Migration: Add location fields to postings table
-- Supports location mode, location name/coordinates, and max distance for matching

ALTER TABLE public.postings
  ADD COLUMN IF NOT EXISTS location_mode text DEFAULT 'either'
    CHECK (location_mode IN ('remote', 'in_person', 'either')),
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS max_distance_km integer;

COMMENT ON COLUMN public.postings.location_mode IS 'Location mode: remote, in_person, or either';
COMMENT ON COLUMN public.postings.location_name IS 'Human-readable location name (e.g., Berlin, Germany)';
COMMENT ON COLUMN public.postings.location_lat IS 'Latitude coordinate for distance-based matching';
COMMENT ON COLUMN public.postings.location_lng IS 'Longitude coordinate for distance-based matching';
COMMENT ON COLUMN public.postings.max_distance_km IS 'Maximum distance in km for in-person matching (hard filter)';
