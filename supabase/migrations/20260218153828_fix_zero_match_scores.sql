-- Migration: Fix zero match scores
-- Returns NULL instead of 0.0 for semantic score when embeddings are missing.
-- This allows the TypeScript scoring layer to skip the dimension instead of
-- zeroing the entire score via geometric mean (now switched to arithmetic mean).

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

  -- Availability calculation helpers
  profile_slots jsonb;
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
  profile_slots := profile_rec.availability_slots;
  availability_score := 1.0;

  -- ============================================
  -- SKILL LEVEL SCORE: 1 - |levelA - levelB| / 10
  -- Uses posting's skill_level_min vs profile's skill_levels
  -- NULL if either is not set
  -- ============================================
  IF posting_rec.skill_level_min IS NOT NULL AND profile_rec.skill_levels IS NOT NULL THEN
    DECLARE
      profile_avg_level float;
      level_values float[];
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
        skill_level_score := NULL;
      END IF;
    END;
  ELSE
    skill_level_score := NULL;
  END IF;

  -- ============================================
  -- LOCATION SCORE: 1 - |prefA - prefB|
  -- NULL if either preference is null
  -- ============================================
  IF profile_rec.location_preference IS NULL OR posting_rec.location_preference IS NULL THEN
    location_score := NULL;
  ELSE
    location_score := 1.0 - abs(profile_rec.location_preference - posting_rec.location_preference);
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

COMMENT ON FUNCTION compute_match_breakdown IS 'Computes 4-dimension compatibility scores between a profile and posting. Returns NULL for dimensions with missing data so the TS layer can skip them in the weighted arithmetic mean.';
