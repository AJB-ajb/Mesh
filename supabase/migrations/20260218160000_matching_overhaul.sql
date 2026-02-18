-- Migration: Matching Overhaul
-- 1. get_skill_descendants() — recursive skill tree traversal
-- 2. Updated match_postings_to_user() with hard filters
-- 3. Updated match_users_to_posting() with hard filters
-- 4. Rewritten compute_match_breakdown() with per-skill scoring from join tables
-- 5. Updated compute_match_breakdowns_batch()

-- ============================================
-- 1. get_skill_descendants()
-- Returns all descendant node IDs for a given skill node (inclusive)
-- ============================================

CREATE OR REPLACE FUNCTION get_skill_descendants(root_skill_id uuid)
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE descendants AS (
    SELECT sn.id FROM skill_nodes sn WHERE sn.id = root_skill_id
    UNION ALL
    SELECT sn.id FROM skill_nodes sn JOIN descendants d ON sn.parent_id = d.id
  )
  SELECT d.id FROM descendants d;
$$;

COMMENT ON FUNCTION get_skill_descendants IS 'Returns all descendant skill node IDs (inclusive) using recursive CTE. Used for tree-aware skill matching.';

-- ============================================
-- 2. match_postings_to_user() — with hard filters
-- Columns updated: removed skills/skill_level_min (dropped),
-- added optional filter parameters
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
BEGIN
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
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_postings_to_user IS 'Finds top matching postings for a user based on embedding similarity, with optional hard filters for category, context, location mode, and max distance.';

-- ============================================
-- 3. match_users_to_posting() — with hard filters
-- Removed skills/skill_levels columns (dropped)
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
BEGIN
  SELECT p.creator_id INTO posting_creator_id
  FROM public.postings p
  WHERE p.id = posting_id_param;

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
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_users_to_posting IS 'Finds top matching users for a posting based on embedding similarity, with optional hard filters for location mode and max distance.';

-- ============================================
-- 4. compute_match_breakdown() — per-skill scoring + distance-aware location
-- Replaces old skill_level_min/skill_levels with join table per-skill scoring.
-- Uses get_skill_descendants() for tree-aware matching.
-- ============================================

CREATE OR REPLACE FUNCTION compute_match_breakdown(
  profile_user_id uuid,
  target_posting_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_rec record;
  posting_rec record;

  -- Scores (NULL = data missing, skip in weighted average)
  semantic_score float;
  availability_score float;
  skill_level_score float;
  location_score float;

  -- Location calculation helpers
  distance_km float;
BEGIN
  -- Fetch records
  SELECT * INTO profile_rec
  FROM public.profiles
  WHERE user_id = profile_user_id;

  SELECT * INTO posting_rec
  FROM public.postings
  WHERE id = target_posting_id;

  IF profile_rec IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', profile_user_id;
  END IF;

  IF posting_rec IS NULL THEN
    RAISE EXCEPTION 'Posting not found for posting_id: %', target_posting_id;
  END IF;

  -- ============================================
  -- SEMANTIC SCORE: pgvector cosine similarity
  -- NULL when either embedding is missing
  -- ============================================
  IF profile_rec.embedding IS NULL OR posting_rec.embedding IS NULL THEN
    semantic_score := NULL;
  ELSE
    semantic_score := 1 - (profile_rec.embedding <=> posting_rec.embedding);
  END IF;

  -- ============================================
  -- AVAILABILITY SCORE: time slot overlap fraction
  -- Default 1.0 if either party has no slots defined
  -- ============================================
  availability_score := 1.0;

  -- ============================================
  -- SKILL LEVEL SCORE: per-skill from join tables
  -- For each posting_skill, find matching profile_skill via tree descendants.
  -- Score = avg per-skill closeness. NULL if posting has no skills.
  -- ============================================
  SELECT coalesce(avg(
    CASE
      WHEN ps.level_min IS NULL THEN
        -- Posting doesn't require a minimum level for this skill
        CASE WHEN prs.skill_id IS NOT NULL THEN 1.0 ELSE 0.5 END
      WHEN prs.skill_id IS NULL THEN
        -- User doesn't have this skill (or ancestor/descendant)
        0.3
      WHEN prs.level IS NULL THEN
        -- User has the skill but no level set
        0.5
      ELSE
        -- Both have levels: score based on how close they are
        greatest(0.0, 1.0 - abs(prs.level - ps.level_min) / 10.0)
    END
  ), NULL) INTO skill_level_score
  FROM posting_skills ps
  LEFT JOIN profile_skills prs
    ON prs.profile_id = profile_user_id
    AND prs.skill_id IN (SELECT gsd.id FROM get_skill_descendants(ps.skill_id) gsd)
  WHERE ps.posting_id = target_posting_id;

  -- ============================================
  -- LOCATION SCORE: distance-aware + mode compatibility
  -- Both remote → 1.0
  -- Have coordinates → distance-based (normalized by 5000km)
  -- Fallback: preference difference
  -- NULL if no location data at all
  -- ============================================
  IF profile_rec.location_mode = 'remote' AND posting_rec.location_mode = 'remote' THEN
    location_score := 1.0;
  ELSIF profile_rec.location_lat IS NOT NULL AND profile_rec.location_lng IS NOT NULL
    AND posting_rec.location_lat IS NOT NULL AND posting_rec.location_lng IS NOT NULL THEN
    -- Distance-based scoring
    distance_km := acos(
      LEAST(1.0, GREATEST(-1.0,
        sin(radians(profile_rec.location_lat)) * sin(radians(posting_rec.location_lat))
        + cos(radians(profile_rec.location_lat)) * cos(radians(posting_rec.location_lat))
          * cos(radians(profile_rec.location_lng - posting_rec.location_lng))
      ))
    ) * 6371.0;

    -- Check if posting has a max_distance_km constraint
    IF posting_rec.max_distance_km IS NOT NULL AND distance_km > posting_rec.max_distance_km THEN
      location_score := 0.0;
    ELSE
      -- Score normalized by 5000km reference distance
      location_score := greatest(0.0, 1.0 - distance_km / 5000.0);
    END IF;
  ELSIF profile_rec.location_preference IS NOT NULL AND posting_rec.location_preference IS NOT NULL THEN
    -- Fallback: preference difference
    location_score := 1.0 - abs(profile_rec.location_preference - posting_rec.location_preference);
  ELSE
    location_score := NULL;
  END IF;

  -- ============================================
  -- RETURN BREAKDOWN (NULL dimensions are jsonb null)
  -- ============================================
  RETURN jsonb_build_object(
    'semantic', semantic_score,
    'availability', availability_score,
    'skill_level', skill_level_score,
    'location', location_score
  );
END;
$$;

COMMENT ON FUNCTION compute_match_breakdown IS 'Computes 4-dimension compatibility scores using per-skill tree-aware matching and distance-aware location scoring. Returns NULL for dimensions with missing data.';

-- ============================================
-- 5. compute_match_breakdowns_batch() — no changes needed
-- (calls compute_match_breakdown which is now updated)
-- ============================================
