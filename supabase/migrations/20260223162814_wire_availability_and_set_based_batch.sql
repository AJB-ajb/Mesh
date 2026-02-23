-- Migration: Wire availability scoring into breakdown + rewrite batch as set-based
-- 1. Update compute_match_breakdown() to use compute_availability_score()
-- 2. Rewrite compute_match_breakdowns_batch() as a single set-based query

-- ============================================
-- 1. compute_match_breakdown() — wire in real availability scoring
-- Replaces hardcoded availability_score := 1.0 with compute_availability_score()
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
  -- AVAILABILITY SCORE: use compute_availability_score()
  -- Handles availability_windows + calendar_busy_blocks overlap
  -- Returns 1.0 when no data exists on either side
  -- ============================================
  availability_score := compute_availability_score(profile_user_id, target_posting_id);

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
  -- Both remote -> 1.0
  -- Have coordinates -> distance-based (normalized by 5000km)
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

COMMENT ON FUNCTION compute_match_breakdown IS 'Computes 4-dimension compatibility scores using per-skill tree-aware matching, real availability scoring via compute_availability_score(), and distance-aware location scoring.';

-- ============================================
-- 2. compute_match_breakdowns_batch() — set-based rewrite
-- Replaces FOREACH loop with a single query that computes all dimensions
-- in one pass across all postings.
-- ============================================

CREATE OR REPLACE FUNCTION compute_match_breakdowns_batch(
  profile_user_id uuid,
  posting_ids uuid[]
)
RETURNS TABLE (
  posting_id uuid,
  breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_rec record;
BEGIN
  -- Fetch profile once for all postings
  SELECT * INTO profile_rec
  FROM public.profiles
  WHERE user_id = profile_user_id;

  IF profile_rec IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', profile_user_id;
  END IF;

  RETURN QUERY
  WITH target_postings AS (
    SELECT p.*
    FROM public.postings p
    WHERE p.id = ANY(posting_ids)
  ),
  -- Semantic scores: computed in one pass via pgvector
  semantic AS (
    SELECT
      tp.id AS pid,
      CASE
        WHEN profile_rec.embedding IS NULL OR tp.embedding IS NULL THEN NULL
        ELSE 1 - (profile_rec.embedding <=> tp.embedding)
      END AS score
    FROM target_postings tp
  ),
  -- Availability scores: still per-posting via compute_availability_score()
  -- (it does correlated subqueries on availability_windows)
  availability AS (
    SELECT
      tp.id AS pid,
      compute_availability_score(profile_user_id, tp.id) AS score
    FROM target_postings tp
  ),
  -- Skill scores: single join across all posting_skills
  skill_per_posting_skill AS (
    SELECT
      ps.posting_id AS pid,
      CASE
        WHEN ps.level_min IS NULL THEN
          CASE WHEN prs.skill_id IS NOT NULL THEN 1.0 ELSE 0.5 END
        WHEN prs.skill_id IS NULL THEN 0.3
        WHEN prs.level IS NULL THEN 0.5
        ELSE greatest(0.0, 1.0 - abs(prs.level - ps.level_min) / 10.0)
      END AS skill_score
    FROM posting_skills ps
    INNER JOIN target_postings tp ON tp.id = ps.posting_id
    LEFT JOIN profile_skills prs
      ON prs.profile_id = profile_user_id
      AND prs.skill_id IN (SELECT gsd.id FROM get_skill_descendants(ps.skill_id) gsd)
  ),
  skill_agg AS (
    SELECT
      sps.pid,
      avg(sps.skill_score) AS score
    FROM skill_per_posting_skill sps
    GROUP BY sps.pid
  ),
  -- Location scores: computed in one pass
  location AS (
    SELECT
      tp.id AS pid,
      CASE
        WHEN profile_rec.location_mode = 'remote' AND tp.location_mode = 'remote' THEN 1.0
        WHEN profile_rec.location_lat IS NOT NULL AND profile_rec.location_lng IS NOT NULL
          AND tp.location_lat IS NOT NULL AND tp.location_lng IS NOT NULL THEN
          CASE
            WHEN tp.max_distance_km IS NOT NULL AND (
              acos(LEAST(1.0, GREATEST(-1.0,
                sin(radians(profile_rec.location_lat)) * sin(radians(tp.location_lat))
                + cos(radians(profile_rec.location_lat)) * cos(radians(tp.location_lat))
                  * cos(radians(profile_rec.location_lng - tp.location_lng))
              ))) * 6371.0
            ) > tp.max_distance_km THEN 0.0
            ELSE greatest(0.0, 1.0 - (
              acos(LEAST(1.0, GREATEST(-1.0,
                sin(radians(profile_rec.location_lat)) * sin(radians(tp.location_lat))
                + cos(radians(profile_rec.location_lat)) * cos(radians(tp.location_lat))
                  * cos(radians(profile_rec.location_lng - tp.location_lng))
              ))) * 6371.0
            ) / 5000.0)
          END
        WHEN profile_rec.location_preference IS NOT NULL AND tp.location_preference IS NOT NULL THEN
          1.0 - abs(profile_rec.location_preference - tp.location_preference)
        ELSE NULL
      END AS score
    FROM target_postings tp
  )
  SELECT
    tp.id AS posting_id,
    jsonb_build_object(
      'semantic', sem.score,
      'availability', avail.score,
      'skill_level', sk.score,
      'location', loc.score
    ) AS breakdown
  FROM target_postings tp
  LEFT JOIN semantic sem ON sem.pid = tp.id
  LEFT JOIN availability avail ON avail.pid = tp.id
  LEFT JOIN skill_agg sk ON sk.pid = tp.id
  LEFT JOIN location loc ON loc.pid = tp.id;
END;
$$;

COMMENT ON FUNCTION compute_match_breakdowns_batch IS 'Set-based batch computation of match breakdowns. Fetches profile once, computes semantic + location in a single pass, skill scores via a single join, and availability per posting.';
