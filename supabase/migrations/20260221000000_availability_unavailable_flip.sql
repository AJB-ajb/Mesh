-- Migration: Flip availability semantics for profiles
-- Profile windows now mean "unavailable/blocked time" (not "available").
-- Posting windows remain "required available time" (unchanged).
-- Scoring: score = 1 - (blocked_overlap / posting_total)
-- Data cleanup: delete old profile availability_windows (migrated with wrong semantics).

-- ============================================
-- 1. Delete old profile windows (old "available" semantics)
-- These were migrated from availability_slots with positive semantics.
-- Users will need to re-enter their unavailability.
-- ============================================

DELETE FROM availability_windows WHERE profile_id IS NOT NULL;

-- ============================================
-- 2. Update compute_availability_score() for inverted semantics
-- Old: overlap of user's available windows with posting's required windows
-- New: score = 1 - (blocked_overlap / posting_total)
-- Where blocked_overlap = overlap of user's UNAVAILABLE windows with posting's REQUIRED windows
-- ============================================

CREATE OR REPLACE FUNCTION compute_availability_score(
  p_profile_id uuid,
  p_posting_id uuid
)
RETURNS float
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  posting_total_minutes float;
  blocked_overlap_minutes float;
  posting_has_windows boolean;
  user_has_windows boolean;
BEGIN
  -- Check if posting has recurring windows
  SELECT EXISTS(
    SELECT 1 FROM availability_windows
    WHERE posting_id = p_posting_id
      AND window_type = 'recurring'
      AND canonical_range IS NOT NULL
  ) INTO posting_has_windows;

  -- If posting has no windows → 1.0 (flexible, no constraint)
  IF NOT posting_has_windows THEN
    RETURN 1.0;
  END IF;

  -- Check if user has recurring windows (these are now UNAVAILABLE windows)
  SELECT EXISTS(
    SELECT 1 FROM availability_windows
    WHERE profile_id = p_profile_id
      AND window_type = 'recurring'
      AND canonical_range IS NOT NULL
  ) INTO user_has_windows;

  -- If user has no windows → 1.0 (never blocked = always free)
  IF NOT user_has_windows THEN
    RETURN 1.0;
  END IF;

  -- Compute posting's total minutes from recurring windows
  SELECT COALESCE(SUM(upper(aw.canonical_range) - lower(aw.canonical_range)), 0)
  INTO posting_total_minutes
  FROM availability_windows aw
  WHERE aw.posting_id = p_posting_id
    AND aw.window_type = 'recurring'
    AND aw.canonical_range IS NOT NULL;

  IF posting_total_minutes = 0 THEN
    RETURN 1.0;
  END IF;

  -- Compute overlap of user's BLOCKED windows with posting's required windows
  SELECT COALESCE(SUM(
    upper(pw.canonical_range * uw.canonical_range)
    - lower(pw.canonical_range * uw.canonical_range)
  ), 0)
  INTO blocked_overlap_minutes
  FROM availability_windows pw
  JOIN availability_windows uw
    ON pw.canonical_range && uw.canonical_range
  WHERE pw.posting_id = p_posting_id
    AND pw.window_type = 'recurring'
    AND pw.canonical_range IS NOT NULL
    AND uw.profile_id = p_profile_id
    AND uw.window_type = 'recurring'
    AND uw.canonical_range IS NOT NULL;

  -- Score = 1 - (blocked_overlap / posting_total)
  -- Higher score = less conflict between user's blocked time and posting's required time
  RETURN 1.0 - LEAST(1.0, blocked_overlap_minutes / posting_total_minutes);
END;
$$;

COMMENT ON FUNCTION compute_availability_score IS 'Computes availability score as 1 - (blocked_overlap / posting_total). Profile windows are unavailable/blocked time; posting windows are required available time. Returns 1.0 if either side has no windows.';

-- ============================================
-- 3. Update hard filter in match_users_to_posting
-- Old: exclude if zero overlap (no shared available time)
-- New: exclude if blocked_overlap >= posting_total (user blocked for ALL of posting time)
-- ============================================

CREATE OR REPLACE FUNCTION match_users_to_posting(
  posting_embedding extensions.vector(1536),
  posting_id_param uuid,
  match_limit integer DEFAULT 10,
  location_mode_filter text DEFAULT NULL,
  posting_location_lat double precision DEFAULT NULL,
  posting_location_lng double precision DEFAULT NULL,
  max_distance_km double precision DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  similarity float,
  full_name text,
  headline text,
  bio text,
  location_preference double precision,
  availability_slots jsonb,
  location_mode text,
  location_lat double precision,
  location_lng double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  posting_creator_id uuid;
  posting_has_windows boolean;
  posting_total float;
BEGIN
  SELECT p.creator_id INTO posting_creator_id
  FROM public.postings p
  WHERE p.id = posting_id_param;

  -- Check if posting has recurring availability windows
  SELECT EXISTS(
    SELECT 1 FROM availability_windows aw
    WHERE aw.posting_id = posting_id_param
      AND aw.window_type = 'recurring'
      AND aw.canonical_range IS NOT NULL
  ) INTO posting_has_windows;

  -- Pre-compute posting total for hard filter
  IF posting_has_windows THEN
    SELECT COALESCE(SUM(upper(aw.canonical_range) - lower(aw.canonical_range)), 0)
    INTO posting_total
    FROM availability_windows aw
    WHERE aw.posting_id = posting_id_param
      AND aw.window_type = 'recurring'
      AND aw.canonical_range IS NOT NULL;
  ELSE
    posting_total := 0;
  END IF;

  RETURN QUERY
  SELECT
    pr.user_id,
    1 - (pr.embedding <=> posting_embedding) AS similarity,
    pr.full_name,
    pr.headline,
    pr.bio,
    pr.location_preference,
    pr.availability_slots,
    pr.location_mode,
    pr.location_lat,
    pr.location_lng
  FROM public.profiles pr
  WHERE
    pr.embedding IS NOT NULL
    AND pr.user_id != posting_creator_id
    -- Hard filter: location mode
    AND (
      location_mode_filter IS NULL
      OR pr.location_mode IS NULL
      OR pr.location_mode = 'either'
      OR location_mode_filter = 'either'
      OR pr.location_mode = location_mode_filter
    )
    -- Hard filter: max distance
    AND (
      max_distance_km IS NULL
      OR posting_location_lat IS NULL
      OR posting_location_lng IS NULL
      OR pr.location_lat IS NULL
      OR pr.location_lng IS NULL
      OR (
        acos(
          LEAST(1.0, GREATEST(-1.0,
            sin(radians(posting_location_lat)) * sin(radians(pr.location_lat))
            + cos(radians(posting_location_lat)) * cos(radians(pr.location_lat))
              * cos(radians(posting_location_lng - pr.location_lng))
          ))
        ) * 6371.0
      ) <= max_distance_km
    )
    -- Hard filter: availability — exclude only if user is blocked for ALL posting time
    AND (
      NOT posting_has_windows
      OR posting_total = 0
      OR NOT EXISTS(
        SELECT 1 FROM availability_windows uaw
        WHERE uaw.profile_id = pr.user_id
          AND uaw.window_type = 'recurring'
          AND uaw.canonical_range IS NOT NULL
      )
      OR (
        -- Blocked overlap < posting total (user is free for at least some of posting time)
        COALESCE((
          SELECT SUM(
            upper(paw.canonical_range * uaw.canonical_range)
            - lower(paw.canonical_range * uaw.canonical_range)
          )
          FROM availability_windows paw
          JOIN availability_windows uaw
            ON paw.canonical_range && uaw.canonical_range
          WHERE paw.posting_id = posting_id_param
            AND paw.window_type = 'recurring'
            AND paw.canonical_range IS NOT NULL
            AND uaw.profile_id = pr.user_id
            AND uaw.window_type = 'recurring'
            AND uaw.canonical_range IS NOT NULL
        ), 0) < posting_total
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_users_to_posting(extensions.vector, uuid, integer, text, double precision, double precision, double precision) IS 'Finds top matching users for a posting. Hard filter excludes users whose blocked time covers ALL of posting required time.';

-- ============================================
-- 4. Update hard filter in match_postings_to_user
-- ============================================

CREATE OR REPLACE FUNCTION match_postings_to_user(
  user_embedding extensions.vector(1536),
  user_id_param uuid,
  match_limit integer DEFAULT 10,
  category_filter text DEFAULT NULL,
  context_filter text DEFAULT NULL,
  location_mode_filter text DEFAULT NULL,
  user_location_lat double precision DEFAULT NULL,
  user_location_lng double precision DEFAULT NULL,
  max_distance_km double precision DEFAULT NULL
)
RETURNS TABLE (
  posting_id uuid,
  similarity float,
  title text,
  description text,
  team_size_min integer,
  team_size_max integer,
  category text,
  mode text,
  location_preference double precision,
  tags text[],
  estimated_time text,
  creator_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  context_identifier text,
  natural_language_criteria text,
  auto_accept boolean,
  location_mode text,
  location_lat double precision,
  location_lng double precision,
  max_distance_km_val double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_has_windows boolean;
BEGIN
  -- Check if user has recurring availability windows (these are BLOCKED windows)
  SELECT EXISTS(
    SELECT 1 FROM availability_windows aw
    WHERE aw.profile_id = user_id_param
      AND aw.window_type = 'recurring'
      AND aw.canonical_range IS NOT NULL
  ) INTO user_has_windows;

  RETURN QUERY
  SELECT
    p.id AS posting_id,
    1 - (p.embedding <=> user_embedding) AS similarity,
    p.title,
    p.description,
    p.team_size_min,
    p.team_size_max,
    p.category,
    p.mode,
    p.location_preference,
    p.tags,
    p.estimated_time,
    p.creator_id,
    p.created_at,
    p.expires_at,
    p.context_identifier,
    p.natural_language_criteria,
    p.auto_accept,
    p.location_mode,
    p.location_lat,
    p.location_lng,
    p.max_distance_km AS max_distance_km_val
  FROM public.postings p
  WHERE
    p.status = 'open'
    AND p.embedding IS NOT NULL
    AND p.creator_id != user_id_param
    AND p.expires_at > now()
    -- Hard filter: category
    AND (category_filter IS NULL OR p.category = category_filter)
    -- Hard filter: context identifier
    AND (context_filter IS NULL OR p.context_identifier IS NULL OR p.context_identifier = context_filter)
    -- Hard filter: location mode compatibility
    AND (
      location_mode_filter IS NULL
      OR p.location_mode IS NULL
      OR p.location_mode = 'either'
      OR location_mode_filter = 'either'
      OR p.location_mode = location_mode_filter
    )
    -- Hard filter: max distance (haversine)
    AND (
      max_distance_km IS NULL
      OR user_location_lat IS NULL
      OR user_location_lng IS NULL
      OR p.location_lat IS NULL
      OR p.location_lng IS NULL
      OR (
        acos(
          LEAST(1.0, GREATEST(-1.0,
            sin(radians(user_location_lat)) * sin(radians(p.location_lat))
            + cos(radians(user_location_lat)) * cos(radians(p.location_lat))
              * cos(radians(user_location_lng - p.location_lng))
          ))
        ) * 6371.0
      ) <= max_distance_km
    )
    -- Hard filter: availability — exclude if user is blocked for ALL posting time
    AND (
      p.availability_mode = 'flexible'
      OR NOT user_has_windows
      OR NOT EXISTS(
        SELECT 1 FROM availability_windows paw
        WHERE paw.posting_id = p.id
          AND paw.window_type = 'recurring'
          AND paw.canonical_range IS NOT NULL
      )
      OR (
        COALESCE((
          SELECT SUM(
            upper(paw.canonical_range * uaw.canonical_range)
            - lower(paw.canonical_range * uaw.canonical_range)
          )
          FROM availability_windows paw
          JOIN availability_windows uaw
            ON paw.canonical_range && uaw.canonical_range
          WHERE paw.posting_id = p.id
            AND paw.window_type = 'recurring'
            AND paw.canonical_range IS NOT NULL
            AND uaw.profile_id = user_id_param
            AND uaw.window_type = 'recurring'
            AND uaw.canonical_range IS NOT NULL
        ), 0) < COALESCE((
          SELECT SUM(upper(paw2.canonical_range) - lower(paw2.canonical_range))
          FROM availability_windows paw2
          WHERE paw2.posting_id = p.id
            AND paw2.window_type = 'recurring'
            AND paw2.canonical_range IS NOT NULL
        ), 0)
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_postings_to_user(extensions.vector, uuid, integer, text, text, text, double precision, double precision, double precision) IS 'Finds top matching postings for a user. Profile windows are blocked/unavailable time. Hard filter excludes postings where user is blocked for ALL required time.';
