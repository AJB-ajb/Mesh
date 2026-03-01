-- Add skill overlap as a hard filter to matching RPCs.
-- If a posting has required skills, candidate must have at least one
-- tree-matching skill (using get_skill_descendants). Postings with
-- no required skills match anyone.

-- Drop existing overloads so we can redefine with new WHERE clauses
DROP FUNCTION IF EXISTS match_postings_to_user(extensions.vector, uuid, integer, text, text, text, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS match_users_to_posting(extensions.vector, uuid, integer, text, double precision, double precision, double precision);

-- ============================================
-- Update match_postings_to_user()
-- Add skill overlap hard filter
-- ============================================

CREATE OR REPLACE FUNCTION match_postings_to_user(
  user_embedding extensions.vector(1536),
  user_id_param uuid,
  match_limit integer DEFAULT 10,
  -- Optional hard filters
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
  visibility text,
  location_preference double precision,
  tags text[],
  estimated_time text,
  creator_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  context_identifier text,
  natural_language_criteria text,
  auto_accept boolean,
  availability_mode text,
  timezone text,
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
    p.visibility,
    p.location_preference,
    p.tags,
    p.estimated_time,
    p.creator_id,
    p.created_at,
    p.expires_at,
    p.context_identifier,
    p.natural_language_criteria,
    p.auto_accept,
    p.availability_mode,
    p.timezone,
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
    -- Hard filter: availability (from previous migration)
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
    -- Hard filter: skill overlap (tree-aware)
    -- If posting has required skills, user must have at least one matching skill
    AND (
      NOT EXISTS (SELECT 1 FROM posting_skills ps WHERE ps.posting_id = p.id)
      OR EXISTS (
        SELECT 1 FROM posting_skills ps
        JOIN profile_skills prs ON prs.profile_id = user_id_param
          AND prs.skill_id IN (SELECT gsd.id FROM get_skill_descendants(ps.skill_id) gsd)
        WHERE ps.posting_id = p.id
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_postings_to_user IS 'Finds top matching postings for a user. Includes hard filters for category, context, location, availability, and skill overlap (tree-aware).';

-- ============================================
-- Update match_users_to_posting()
-- Add skill overlap hard filter (reversed direction)
-- ============================================

CREATE OR REPLACE FUNCTION match_users_to_posting(
  posting_embedding extensions.vector(1536),
  posting_id_param uuid,
  match_limit integer DEFAULT 10,
  -- Optional hard filters
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
    -- Hard filter: availability (from previous migration)
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
    -- Hard filter: skill overlap (reversed — if posting has required skills,
    -- user must have at least one matching skill; if posting has no skills, anyone matches)
    AND (
      NOT EXISTS (SELECT 1 FROM posting_skills ps WHERE ps.posting_id = posting_id_param)
      OR EXISTS (
        SELECT 1 FROM profile_skills prs
        JOIN posting_skills ps ON ps.posting_id = posting_id_param
          AND ps.skill_id IN (SELECT gsd.id FROM get_skill_descendants(prs.skill_id) gsd)
        WHERE prs.profile_id = pr.user_id
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_users_to_posting IS 'Finds top matching users for a posting. Includes hard filters for location, availability, and skill overlap (tree-aware).';
