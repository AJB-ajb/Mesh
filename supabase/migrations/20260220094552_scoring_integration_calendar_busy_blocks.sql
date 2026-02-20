-- Migration: Scoring integration with calendar busy blocks
-- 1. get_effective_blocked_ranges() — UNION of availability_windows + calendar_busy_blocks
-- 2. Update compute_availability_score() to use effective ranges
-- 3. Update hard filters in match_users_to_posting() and match_postings_to_user()

-- ============================================
-- 1. get_effective_blocked_ranges()
-- Returns all blocked canonical ranges for a profile:
-- - availability_windows (user-defined blocked time)
-- - calendar_busy_blocks (imported calendar busy time, from canonical_ranges array)
-- ============================================

CREATE OR REPLACE FUNCTION get_effective_blocked_ranges(p_profile_id uuid)
RETURNS TABLE (blocked_range int4range)
LANGUAGE sql
STABLE
AS $$
  -- User-defined blocked windows (from availability_windows)
  SELECT aw.canonical_range AS blocked_range
  FROM availability_windows aw
  WHERE aw.profile_id = p_profile_id
    AND aw.window_type = 'recurring'
    AND aw.canonical_range IS NOT NULL

  UNION ALL

  -- Calendar busy blocks (from canonical_ranges array)
  SELECT unnest(cbb.canonical_ranges)::int4range AS blocked_range
  FROM calendar_busy_blocks cbb
  WHERE cbb.profile_id = p_profile_id
    AND cbb.canonical_ranges IS NOT NULL
$$;

COMMENT ON FUNCTION get_effective_blocked_ranges IS 'Returns all effective blocked canonical ranges for a profile: user-defined availability_windows UNION calendar_busy_blocks canonical projections.';

-- ============================================
-- 2. Update compute_availability_score()
-- Now uses get_effective_blocked_ranges() instead of querying availability_windows directly
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
  user_has_blocks boolean;
BEGIN
  -- Check if posting has recurring windows
  SELECT EXISTS(
    SELECT 1 FROM availability_windows
    WHERE posting_id = p_posting_id
      AND window_type = 'recurring'
      AND canonical_range IS NOT NULL
  ) INTO posting_has_windows;

  IF NOT posting_has_windows THEN
    RETURN 1.0;
  END IF;

  -- Check if user has any blocked ranges (manual or calendar)
  SELECT EXISTS(
    SELECT 1 FROM get_effective_blocked_ranges(p_profile_id)
  ) INTO user_has_blocks;

  IF NOT user_has_blocks THEN
    RETURN 1.0;
  END IF;

  -- Compute posting's total minutes
  SELECT COALESCE(SUM(upper(aw.canonical_range) - lower(aw.canonical_range)), 0)
  INTO posting_total_minutes
  FROM availability_windows aw
  WHERE aw.posting_id = p_posting_id
    AND aw.window_type = 'recurring'
    AND aw.canonical_range IS NOT NULL;

  IF posting_total_minutes = 0 THEN
    RETURN 1.0;
  END IF;

  -- Compute overlap of user's effective blocked ranges with posting's required windows
  SELECT COALESCE(SUM(
    upper(pw.canonical_range * ebr.blocked_range)
    - lower(pw.canonical_range * ebr.blocked_range)
  ), 0)
  INTO blocked_overlap_minutes
  FROM availability_windows pw
  CROSS JOIN get_effective_blocked_ranges(p_profile_id) ebr
  WHERE pw.posting_id = p_posting_id
    AND pw.window_type = 'recurring'
    AND pw.canonical_range IS NOT NULL
    AND pw.canonical_range && ebr.blocked_range;

  RETURN 1.0 - LEAST(1.0, blocked_overlap_minutes / posting_total_minutes);
END;
$$;

COMMENT ON FUNCTION compute_availability_score IS 'Computes availability score as 1 - (blocked_overlap / posting_total). Uses get_effective_blocked_ranges() which unions manual blocked windows with calendar busy blocks.';

-- ============================================
-- 3. Update match_users_to_posting with effective blocked ranges
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

  SELECT EXISTS(
    SELECT 1 FROM availability_windows aw
    WHERE aw.posting_id = posting_id_param
      AND aw.window_type = 'recurring'
      AND aw.canonical_range IS NOT NULL
  ) INTO posting_has_windows;

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
    -- Hard filter: availability — exclude if user's effective blocked time covers ALL posting time
    AND (
      NOT posting_has_windows
      OR posting_total = 0
      OR NOT EXISTS(
        SELECT 1 FROM get_effective_blocked_ranges(pr.user_id)
      )
      OR (
        COALESCE((
          SELECT SUM(
            upper(paw.canonical_range * ebr.blocked_range)
            - lower(paw.canonical_range * ebr.blocked_range)
          )
          FROM availability_windows paw
          CROSS JOIN get_effective_blocked_ranges(pr.user_id) ebr
          WHERE paw.posting_id = posting_id_param
            AND paw.window_type = 'recurring'
            AND paw.canonical_range IS NOT NULL
            AND paw.canonical_range && ebr.blocked_range
        ), 0) < posting_total
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_users_to_posting(extensions.vector, uuid, integer, text, double precision, double precision, double precision) IS 'Finds top matching users for a posting. Hard filter uses get_effective_blocked_ranges() to include both manual and calendar busy blocks.';

-- ============================================
-- 4. Update match_postings_to_user with effective blocked ranges
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
  user_has_blocks boolean;
BEGIN
  -- Check if user has any effective blocked ranges
  SELECT EXISTS(
    SELECT 1 FROM get_effective_blocked_ranges(user_id_param)
  ) INTO user_has_blocks;

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
    -- Hard filter: location mode
    AND (
      location_mode_filter IS NULL
      OR p.location_mode IS NULL
      OR p.location_mode = 'either'
      OR location_mode_filter = 'either'
      OR p.location_mode = location_mode_filter
    )
    -- Hard filter: max distance
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
    -- Hard filter: availability — exclude if user's effective blocked time covers ALL posting time
    AND (
      p.availability_mode = 'flexible'
      OR NOT user_has_blocks
      OR NOT EXISTS(
        SELECT 1 FROM availability_windows paw
        WHERE paw.posting_id = p.id
          AND paw.window_type = 'recurring'
          AND paw.canonical_range IS NOT NULL
      )
      OR (
        COALESCE((
          SELECT SUM(
            upper(paw.canonical_range * ebr.blocked_range)
            - lower(paw.canonical_range * ebr.blocked_range)
          )
          FROM availability_windows paw
          CROSS JOIN get_effective_blocked_ranges(user_id_param) ebr
          WHERE paw.posting_id = p.id
            AND paw.window_type = 'recurring'
            AND paw.canonical_range IS NOT NULL
            AND paw.canonical_range && ebr.blocked_range
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

COMMENT ON FUNCTION match_postings_to_user(extensions.vector, uuid, integer, text, text, text, double precision, double precision, double precision) IS 'Finds top matching postings for a user. Hard filter uses get_effective_blocked_ranges() to include both manual and calendar busy blocks.';
