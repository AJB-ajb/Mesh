-- Migration: Availability Windows (Phases 1-2)
-- 1. availability_windows table + constraints + indexes + trigger
-- 2. New columns on profiles and postings (timezone, availability_mode)
-- 3. RLS policies
-- 4. Data migration from profiles.availability_slots → availability_windows
-- 5. compute_availability_score() function
-- 6. Update compute_match_breakdown() to use real availability scoring
-- 7. Hard filter for zero overlap in matching functions

-- ============================================
-- 1. availability_windows table
-- ============================================

CREATE TABLE IF NOT EXISTS availability_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  posting_id uuid REFERENCES postings(id) ON DELETE CASCADE,
  window_type text NOT NULL,
  -- Recurring fields
  day_of_week smallint,       -- 0=Mon..6=Sun
  start_minutes smallint,     -- 0-1439
  end_minutes smallint,       -- 1-1440
  -- Specific-date fields
  specific_date date,
  start_time_utc timestamptz,
  end_time_utc timestamptz,
  -- Computed field for overlap queries
  canonical_range int4range,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Exactly one owner
  CONSTRAINT exactly_one_owner CHECK (
    (profile_id IS NOT NULL AND posting_id IS NULL) OR
    (profile_id IS NULL AND posting_id IS NOT NULL)
  ),
  -- Window type must be valid
  CONSTRAINT valid_window_type CHECK (window_type IN ('recurring', 'specific')),
  -- Recurring fields required
  CONSTRAINT recurring_fields_required CHECK (
    window_type != 'recurring' OR (
      day_of_week IS NOT NULL AND
      start_minutes IS NOT NULL AND
      end_minutes IS NOT NULL
    )
  ),
  -- Specific fields required
  CONSTRAINT specific_fields_required CHECK (
    window_type != 'specific' OR (
      specific_date IS NOT NULL AND
      start_time_utc IS NOT NULL AND
      end_time_utc IS NOT NULL
    )
  ),
  -- End after start (recurring)
  CONSTRAINT end_after_start_recurring CHECK (
    window_type != 'recurring' OR end_minutes > start_minutes
  ),
  -- End after start (specific)
  CONSTRAINT end_after_start_specific CHECK (
    window_type != 'specific' OR end_time_utc > start_time_utc
  )
);

COMMENT ON TABLE availability_windows IS 'Minute-level availability windows for profiles and postings. Recurring windows have a canonical_range for overlap queries.';

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_availability_windows_profile_id
  ON availability_windows (profile_id) WHERE profile_id IS NOT NULL;

CREATE INDEX idx_availability_windows_posting_id
  ON availability_windows (posting_id) WHERE posting_id IS NOT NULL;

CREATE INDEX idx_availability_windows_canonical_range
  ON availability_windows USING gist (canonical_range) WHERE canonical_range IS NOT NULL;

-- ============================================
-- Trigger: compute canonical_range on insert/update
-- canonical_range = [day*1440 + start_minutes, day*1440 + end_minutes)
-- ============================================

CREATE OR REPLACE FUNCTION compute_canonical_range()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.window_type = 'recurring' AND NEW.day_of_week IS NOT NULL
     AND NEW.start_minutes IS NOT NULL AND NEW.end_minutes IS NOT NULL THEN
    NEW.canonical_range := int4range(
      NEW.day_of_week * 1440 + NEW.start_minutes,
      NEW.day_of_week * 1440 + NEW.end_minutes
    );
  ELSE
    NEW.canonical_range := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_canonical_range
  BEFORE INSERT OR UPDATE ON availability_windows
  FOR EACH ROW
  EXECUTE FUNCTION compute_canonical_range();

-- ============================================
-- 2. RLS Policies
-- ============================================

ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for matching)
CREATE POLICY "Authenticated users can read availability windows"
  ON availability_windows FOR SELECT
  TO authenticated
  USING (true);

-- Profile owner can insert their own windows
CREATE POLICY "Users can insert own profile availability"
  ON availability_windows FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR (
      posting_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM postings p WHERE p.id = posting_id AND p.creator_id = auth.uid()
      )
    )
  );

-- Profile owner can update their own windows
CREATE POLICY "Users can update own availability"
  ON availability_windows FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR (
      posting_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM postings p WHERE p.id = posting_id AND p.creator_id = auth.uid()
      )
    )
  );

-- Profile owner can delete their own windows
CREATE POLICY "Users can delete own availability"
  ON availability_windows FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR (
      posting_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM postings p WHERE p.id = posting_id AND p.creator_id = auth.uid()
      )
    )
  );

-- ============================================
-- 3. New columns on existing tables
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE postings ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS availability_mode text NOT NULL DEFAULT 'flexible';
ALTER TABLE postings ADD CONSTRAINT valid_availability_mode
  CHECK (availability_mode IN ('flexible', 'recurring', 'specific_dates'));

-- ============================================
-- 4. Data migration: profiles.availability_slots → availability_windows
-- Slots: morning=360-720, afternoon=720-1080, evening=1080-1440
-- Days: mon=0, tue=1, wed=2, thu=3, fri=4, sat=5, sun=6
-- ============================================

DO $$
DECLARE
  profile_row record;
  day_key text;
  day_num smallint;
  slot_val text;
  slot_start smallint;
  slot_end smallint;
  day_map jsonb := '{"mon":0,"tue":1,"wed":2,"thu":3,"fri":4,"sat":5,"sun":6}';
  slot_map jsonb := '{"morning":[360,720],"afternoon":[720,1080],"evening":[1080,1440]}';
BEGIN
  FOR profile_row IN
    SELECT user_id, availability_slots
    FROM profiles
    WHERE availability_slots IS NOT NULL
      AND availability_slots != '{}'::jsonb
      AND availability_slots != 'null'::jsonb
  LOOP
    FOR day_key IN SELECT jsonb_object_keys(profile_row.availability_slots)
    LOOP
      day_num := (day_map ->> day_key)::smallint;
      IF day_num IS NULL THEN CONTINUE; END IF;

      FOR slot_val IN SELECT jsonb_array_elements_text(profile_row.availability_slots -> day_key)
      LOOP
        slot_start := (slot_map -> slot_val ->> 0)::smallint;
        slot_end := (slot_map -> slot_val ->> 1)::smallint;
        IF slot_start IS NULL THEN CONTINUE; END IF;

        INSERT INTO availability_windows (profile_id, window_type, day_of_week, start_minutes, end_minutes)
        VALUES (profile_row.user_id, 'recurring', day_num, slot_start, slot_end);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 5. compute_availability_score()
-- Returns overlap fraction between user and posting recurring windows.
-- If either side has no recurring windows, returns 1.0 (no penalty).
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
  overlap_minutes float;
  user_has_windows boolean;
  posting_has_windows boolean;
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

  -- Check if user has recurring windows
  SELECT EXISTS(
    SELECT 1 FROM availability_windows
    WHERE profile_id = p_profile_id
      AND window_type = 'recurring'
      AND canonical_range IS NOT NULL
  ) INTO user_has_windows;

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

  -- Compute overlap minutes between user and posting windows
  SELECT COALESCE(SUM(
    upper(pw.canonical_range * uw.canonical_range)
    - lower(pw.canonical_range * uw.canonical_range)
  ), 0)
  INTO overlap_minutes
  FROM availability_windows pw
  JOIN availability_windows uw
    ON pw.canonical_range && uw.canonical_range
  WHERE pw.posting_id = p_posting_id
    AND pw.window_type = 'recurring'
    AND pw.canonical_range IS NOT NULL
    AND uw.profile_id = p_profile_id
    AND uw.window_type = 'recurring'
    AND uw.canonical_range IS NOT NULL;

  RETURN LEAST(1.0, overlap_minutes / posting_total_minutes);
END;
$$;

COMMENT ON FUNCTION compute_availability_score IS 'Computes overlap fraction between user and posting recurring availability windows. Returns 1.0 if either side has no windows.';

-- ============================================
-- 6. Update compute_match_breakdown()
-- Replace hardcoded availability_score := 1.0 with real scoring
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
  -- AVAILABILITY SCORE: real overlap scoring
  -- Uses compute_availability_score() function
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

COMMENT ON FUNCTION compute_match_breakdown IS 'Computes 4-dimension compatibility scores using per-skill tree-aware matching, real availability overlap scoring, and distance-aware location scoring. Returns NULL for dimensions with missing data.';

-- ============================================
-- 7. Hard filter: exclude zero-overlap candidates in matching functions
-- Re-create match_users_to_posting with availability hard filter
-- ============================================

-- We need to drop and recreate to change the function body
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
  posting_has_windows boolean;
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
    -- Hard filter: availability overlap (skip if posting has no windows)
    AND (
      NOT posting_has_windows
      OR NOT EXISTS(
        SELECT 1 FROM availability_windows uaw
        WHERE uaw.profile_id = pr.user_id
          AND uaw.window_type = 'recurring'
          AND uaw.canonical_range IS NOT NULL
      )
      OR EXISTS(
        SELECT 1
        FROM availability_windows paw
        JOIN availability_windows uaw
          ON paw.canonical_range && uaw.canonical_range
        WHERE paw.posting_id = posting_id_param
          AND paw.window_type = 'recurring'
          AND paw.canonical_range IS NOT NULL
          AND uaw.profile_id = pr.user_id
          AND uaw.window_type = 'recurring'
          AND uaw.canonical_range IS NOT NULL
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_users_to_posting(extensions.vector, uuid, integer, text, double precision, double precision, double precision) IS 'Finds top matching users for a posting based on embedding similarity, with hard filters for location mode, max distance, and availability overlap.';

-- Similarly update match_postings_to_user with availability hard filter
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
DECLARE
  user_has_windows boolean;
BEGIN
  -- Check if user has recurring availability windows
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
    -- Hard filter: availability overlap (skip if posting has no recurring windows)
    AND (
      p.availability_mode = 'flexible'
      OR NOT user_has_windows
      OR NOT EXISTS(
        SELECT 1 FROM availability_windows paw
        WHERE paw.posting_id = p.id
          AND paw.window_type = 'recurring'
          AND paw.canonical_range IS NOT NULL
      )
      OR EXISTS(
        SELECT 1
        FROM availability_windows paw
        JOIN availability_windows uaw
          ON paw.canonical_range && uaw.canonical_range
        WHERE paw.posting_id = p.id
          AND paw.window_type = 'recurring'
          AND paw.canonical_range IS NOT NULL
          AND uaw.profile_id = user_id_param
          AND uaw.window_type = 'recurring'
          AND uaw.canonical_range IS NOT NULL
      )
    )
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION match_postings_to_user(extensions.vector, uuid, integer, text, text, text, double precision, double precision, double precision) IS 'Finds top matching postings for a user based on embedding similarity, with optional hard filters for category, context, location mode, max distance, and availability overlap.';
