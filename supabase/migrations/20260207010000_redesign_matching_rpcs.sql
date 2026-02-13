-- Migration: Redesign Phase 1 — Update matching RPC functions
-- Replaces 6-dimension scoring with 4-dimension scoring.
-- Renames all project-related functions to use "posting" terminology.

-- ============================================
-- 1. DROP OLD FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS match_projects_to_user(extensions.vector(1536), uuid, integer);
DROP FUNCTION IF EXISTS match_users_to_project(extensions.vector(1536), uuid, integer);
DROP FUNCTION IF EXISTS compute_match_breakdown(uuid, uuid);
DROP FUNCTION IF EXISTS expire_old_projects();
DROP FUNCTION IF EXISTS experience_to_ordinal(text);

-- ============================================
-- 2. match_postings_to_user()
-- Find matching postings for a user via pgvector cosine similarity
-- ============================================

CREATE OR REPLACE FUNCTION match_postings_to_user(
  user_embedding extensions.vector(1536),
  user_id_param uuid,
  match_limit integer DEFAULT 10
)
RETURNS TABLE (
  posting_id uuid,
  similarity float,
  title text,
  description text,
  skills text[],
  team_size_min integer,
  team_size_max integer,
  category text,
  mode text,
  location_preference double precision,
  tags text[],
  estimated_time text,
  skill_level_min integer,
  creator_id uuid,
  created_at timestamptz,
  expires_at timestamptz
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
    p.skills,
    p.team_size_min,
    p.team_size_max,
    p.category,
    p.mode,
    p.location_preference,
    p.tags,
    p.estimated_time,
    p.skill_level_min,
    p.creator_id,
    p.created_at,
    p.expires_at
  FROM public.postings p
  WHERE
    p.status = 'open'
    AND p.embedding IS NOT NULL
    AND p.creator_id != user_id_param
    AND p.expires_at > now()
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_postings_to_user IS 'Finds top matching postings for a user based on embedding similarity';

-- ============================================
-- 3. match_users_to_posting()
-- Find matching users for a posting via pgvector cosine similarity
-- ============================================

CREATE OR REPLACE FUNCTION match_users_to_posting(
  posting_embedding extensions.vector(1536),
  posting_id_param uuid,
  match_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  similarity float,
  full_name text,
  headline text,
  bio text,
  skills text[],
  skill_levels jsonb,
  location_preference double precision,
  availability_slots jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  posting_creator_id uuid;
BEGIN
  -- Get posting creator to exclude them from matches
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
    pr.skills,
    pr.skill_levels,
    pr.location_preference,
    pr.availability_slots
  FROM public.profiles pr
  WHERE
    pr.embedding IS NOT NULL
    AND pr.user_id != posting_creator_id
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_users_to_posting IS 'Finds top matching users for a posting based on embedding similarity';

-- ============================================
-- 4. compute_match_breakdown() — 4 dimensions
-- Computes per-dimension compatibility scores
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

  -- Scores
  semantic_score float;
  availability_score float;
  skill_level_score float;
  location_score float;

  -- Availability calculation helpers
  profile_slots jsonb;
  posting_slots jsonb;
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
  -- ============================================
  SELECT CASE
    WHEN profile_rec.embedding IS NULL OR posting_rec.embedding IS NULL THEN 0.0
    ELSE 1 - (profile_rec.embedding <=> posting_rec.embedding)
  END INTO semantic_score;

  -- ============================================
  -- AVAILABILITY SCORE: time slot overlap fraction
  -- Default 1.0 if either party has no slots defined
  -- ============================================
  profile_slots := profile_rec.availability_slots;
  -- Note: posting availability could be derived from estimated_time or
  -- a future availability_slots field on postings. For now, default to 1.0.
  availability_score := 1.0;

  -- ============================================
  -- SKILL LEVEL SCORE: 1 - |levelA - levelB| / 10
  -- Uses posting's skill_level_min vs profile's skill_levels
  -- Default 1.0 if either is not set
  -- ============================================
  IF posting_rec.skill_level_min IS NOT NULL AND profile_rec.skill_levels IS NOT NULL THEN
    DECLARE
      profile_avg_level float;
      level_values float[];
      level_val float;
    BEGIN
      -- Average all skill levels from the profile's skill_levels JSON
      SELECT array_agg(val::float)
      INTO level_values
      FROM jsonb_each_text(profile_rec.skill_levels) AS kv(key, val)
      WHERE kv.val ~ '^\d+(\.\d+)?$';

      IF level_values IS NOT NULL AND array_length(level_values, 1) > 0 THEN
        SELECT avg(v) INTO profile_avg_level FROM unnest(level_values) AS v;
        skill_level_score := greatest(0.0, 1.0 - abs(profile_avg_level - posting_rec.skill_level_min) / 10.0);
      ELSE
        skill_level_score := 1.0;
      END IF;
    END;
  ELSE
    skill_level_score := 1.0;
  END IF;

  -- ============================================
  -- LOCATION SCORE: 1 - |prefA - prefB|
  -- Default 1.0 if either preference is null
  -- ============================================
  SELECT CASE
    WHEN profile_rec.location_preference IS NULL OR posting_rec.location_preference IS NULL THEN 1.0
    ELSE 1.0 - abs(profile_rec.location_preference - posting_rec.location_preference)
  END INTO location_score;

  -- ============================================
  -- RETURN BREAKDOWN
  -- ============================================
  RETURN jsonb_build_object(
    'semantic', coalesce(semantic_score, 0.0),
    'availability', coalesce(availability_score, 1.0),
    'skill_level', coalesce(skill_level_score, 1.0),
    'location', coalesce(location_score, 1.0)
  );
END;
$$;

COMMENT ON FUNCTION compute_match_breakdown IS 'Computes 4-dimension compatibility scores between a profile and posting: semantic, availability, skill_level, location';

-- ============================================
-- 5. compute_match_breakdowns_batch()
-- Batch scoring for multiple postings
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
  pid uuid;
BEGIN
  FOREACH pid IN ARRAY posting_ids
  LOOP
    posting_id := pid;
    breakdown := compute_match_breakdown(profile_user_id, pid);
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION compute_match_breakdowns_batch IS 'Batch compute match breakdowns for a profile against multiple postings';

-- ============================================
-- 6. expire_old_postings()
-- Auto-expire postings past their expiration date
-- ============================================

CREATE OR REPLACE FUNCTION expire_old_postings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.postings
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'open'
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

COMMENT ON FUNCTION expire_old_postings IS 'Automatically expires postings past their expiration date. Returns count of expired postings.';
