-- Migration: Redesign Phase 1 — Rename projects → postings, update schema
-- This migration transforms the data model for the redesigned matching system.

-- ============================================
-- 1. RENAME projects TABLE → postings
-- ============================================

ALTER TABLE public.projects RENAME TO postings;

-- Rename indexes
ALTER INDEX projects_status_idx RENAME TO postings_status_idx;
ALTER INDEX projects_creator_idx RENAME TO postings_creator_idx;
ALTER INDEX projects_expires_at_idx RENAME TO postings_expires_at_idx;
ALTER INDEX projects_skills_idx RENAME TO postings_skills_idx;
ALTER INDEX projects_is_test_data_idx RENAME TO postings_is_test_data_idx;

-- Rename trigger
ALTER TRIGGER set_projects_updated_at ON public.postings RENAME TO set_postings_updated_at;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Open projects are viewable" ON public.postings;
DROP POLICY IF EXISTS "Users can create projects" ON public.postings;
DROP POLICY IF EXISTS "Creators can update own projects" ON public.postings;
DROP POLICY IF EXISTS "Creators can delete own projects" ON public.postings;

-- Recreate RLS policies for postings
CREATE POLICY "Open postings are viewable"
  ON public.postings
  FOR SELECT
  USING (status = 'open' OR creator_id = auth.uid());

CREATE POLICY "Users can create postings"
  ON public.postings
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own postings"
  ON public.postings
  FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own postings"
  ON public.postings
  FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================
-- 2. ADD NEW COLUMNS TO postings
-- ============================================

ALTER TABLE public.postings
  ADD COLUMN category text
    CHECK (category IN ('study', 'hackathon', 'personal', 'professional', 'social')),
  ADD COLUMN context_identifier text,
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN team_size_min integer DEFAULT 1
    CHECK (team_size_min > 0),
  ADD COLUMN team_size_max integer DEFAULT 1,
  ADD COLUMN mode text DEFAULT 'open'
    CHECK (mode IN ('open', 'friend_ask')),
  ADD COLUMN location_preference double precision
    CHECK (location_preference IS NULL OR (location_preference >= 0 AND location_preference <= 1)),
  ADD COLUMN natural_language_criteria text,
  ADD COLUMN estimated_time text,
  ADD COLUMN skill_level_min integer
    CHECK (skill_level_min IS NULL OR (skill_level_min >= 0 AND skill_level_min <= 10));

-- Add cross-column constraint: team_size_max >= team_size_min
ALTER TABLE public.postings
  ADD CONSTRAINT postings_team_size_range CHECK (team_size_max >= team_size_min);

-- ============================================
-- 3. RENAME AND DROP COLUMNS ON postings
-- ============================================

-- Rename required_skills → skills
ALTER TABLE public.postings RENAME COLUMN required_skills TO skills;

-- Migrate data: copy team_size into team_size_min/max
UPDATE public.postings SET
  team_size_min = 1,
  team_size_max = COALESCE(team_size, 1);

-- Update status constraint to add 'paused'
ALTER TABLE public.postings DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.postings ADD CONSTRAINT postings_status_check
  CHECK (status IN ('open', 'closed', 'filled', 'expired', 'paused'));

-- Drop old constraints that reference columns we're about to drop
ALTER TABLE public.postings DROP CONSTRAINT IF EXISTS projects_experience_level_check;
ALTER TABLE public.postings DROP CONSTRAINT IF EXISTS projects_timeline_check;

-- Drop old columns (IF EXISTS for columns that may not be present on all environments)
ALTER TABLE public.postings
  DROP COLUMN IF EXISTS team_size,
  DROP COLUMN IF EXISTS commitment_hours,
  DROP COLUMN IF EXISTS timeline,
  DROP COLUMN IF EXISTS experience_level,
  DROP COLUMN IF EXISTS hard_filters;

-- Add new indexes
CREATE INDEX postings_category_idx ON public.postings(category);
CREATE INDEX postings_context_identifier_idx ON public.postings(context_identifier);
CREATE INDEX postings_tags_idx ON public.postings USING gin(tags);

-- ============================================
-- 4. UPDATE matches TABLE
-- ============================================

-- Rename project_id → posting_id
ALTER TABLE public.matches RENAME COLUMN project_id TO posting_id;

-- Rename indexes
ALTER INDEX matches_project_idx RENAME TO matches_posting_idx;
ALTER INDEX matches_project_status_idx RENAME TO matches_posting_status_idx;

-- Drop and recreate FK constraint
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_project_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_posting_id_fkey
  FOREIGN KEY (posting_id) REFERENCES public.postings(id) ON DELETE CASCADE;

-- Drop and recreate unique constraint
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_project_id_user_id_key;
ALTER TABLE public.matches ADD CONSTRAINT matches_posting_id_user_id_key
  UNIQUE (posting_id, user_id);

-- Update status constraint to add 'interested'
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('pending', 'applied', 'accepted', 'declined', 'interested'));

-- Drop old RLS policies on matches
DROP POLICY IF EXISTS "Users can view their matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;

-- Recreate RLS policies referencing postings
CREATE POLICY "Users can view their matches"
  ON public.matches
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create matches"
  ON public.matches
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their matches"
  ON public.matches
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
  );

-- ============================================
-- 4b. UPDATE applications TABLE (if it exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications'
  ) THEN
    -- Rename project_id → posting_id on applications
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'project_id'
    ) THEN
      ALTER TABLE public.applications RENAME COLUMN project_id TO posting_id;
    END IF;

    -- Update FK constraint
    ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_project_id_fkey;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'applications_posting_id_fkey' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.applications ADD CONSTRAINT applications_posting_id_fkey
        FOREIGN KEY (posting_id) REFERENCES public.postings(id) ON DELETE CASCADE;
    END IF;

    -- Update unique constraint
    ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_project_id_applicant_id_key;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'applications_posting_id_applicant_id_key' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.applications ADD CONSTRAINT applications_posting_id_applicant_id_key
        UNIQUE (posting_id, applicant_id);
    END IF;

    -- Update index
    DROP INDEX IF EXISTS applications_project_id_idx;
    CREATE INDEX IF NOT EXISTS applications_posting_id_idx ON public.applications(posting_id);
  END IF;
END $$;

-- ============================================
-- 4c. UPDATE conversations TABLE (if project_id column exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.conversations RENAME COLUMN project_id TO posting_id;
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_project_id_fkey;
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_posting_id_fkey
      FOREIGN KEY (posting_id) REFERENCES public.postings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4d. UPDATE messages TABLE (if project_id column exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN project_id TO posting_id;
    -- Update FK constraint
    ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_project_id_fkey;
    ALTER TABLE public.messages ADD CONSTRAINT messages_posting_id_fkey
      FOREIGN KEY (posting_id) REFERENCES public.postings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 5. UPDATE profiles TABLE
-- ============================================

-- Add new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skill_levels jsonb,
  ADD COLUMN IF NOT EXISTS location_preference double precision
    CHECK (location_preference IS NULL OR (location_preference >= 0 AND location_preference <= 1)),
  ADD COLUMN IF NOT EXISTS availability_slots jsonb,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision;

-- Migrate data: convert remote_preference (0-100) to location_preference (0-1)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'remote_preference'
  ) THEN
    UPDATE public.profiles
      SET location_preference = remote_preference / 100.0
      WHERE remote_preference IS NOT NULL;
  END IF;
END $$;

-- Drop old constraints that reference columns we're about to drop
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_experience_level_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_collaboration_style_check;

-- Drop old columns (IF EXISTS for columns that may not be present on all environments)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS experience_level,
  DROP COLUMN IF EXISTS availability_hours,
  DROP COLUMN IF EXISTS collaboration_style,
  DROP COLUMN IF EXISTS project_preferences,
  DROP COLUMN IF EXISTS remote_preference,
  DROP COLUMN IF EXISTS hard_filters;

-- Comments for new profile columns
COMMENT ON COLUMN public.profiles.skill_levels IS 'JSON map of domain → skill level (0-10). Example: {"programming": 7, "design": 4}';
COMMENT ON COLUMN public.profiles.location_preference IS 'Location preference: 0.0 = in-person only, 0.5 = either, 1.0 = remote only';
COMMENT ON COLUMN public.profiles.availability_slots IS 'Availability as week-based pattern or block-based time slots (JSON)';

-- ============================================
-- 6. CREATE friend_asks TABLE
-- ============================================

CREATE TABLE public.friend_asks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid REFERENCES public.postings(id) ON DELETE CASCADE NOT NULL,
  creator_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  ordered_friend_list uuid[] NOT NULL,
  current_request_index integer DEFAULT 0,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friend_asks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Creators can manage their friend asks"
  ON public.friend_asks
  FOR ALL
  USING (creator_id = auth.uid());

CREATE POLICY "Friends in list can view friend asks"
  ON public.friend_asks
  FOR SELECT
  USING (auth.uid() = ANY(ordered_friend_list));

-- Indexes
CREATE INDEX friend_asks_posting_idx ON public.friend_asks(posting_id);
CREATE INDEX friend_asks_creator_idx ON public.friend_asks(creator_id);
CREATE INDEX friend_asks_status_idx ON public.friend_asks(status);

-- Auto-update trigger
CREATE TRIGGER set_friend_asks_updated_at
  BEFORE UPDATE ON public.friend_asks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 7. CREATE friendships TABLE
-- ============================================

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their friendships"
  ON public.friendships
  FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friendship requests"
  ON public.friendships
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Participants can update friendships"
  ON public.friendships
  FOR UPDATE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Initiators can delete friendships"
  ON public.friendships
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX friendships_user_idx ON public.friendships(user_id);
CREATE INDEX friendships_friend_idx ON public.friendships(friend_id);
CREATE INDEX friendships_status_idx ON public.friendships(status);

-- ============================================
-- 8. UPDATE notifications TABLE (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'related_project_id'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN related_project_id TO related_posting_id;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.postings IS 'Postings for finding people — projects, activities, social plans';
COMMENT ON COLUMN public.postings.category IS 'Coarse category: study, hackathon, personal, professional, social';
COMMENT ON COLUMN public.postings.context_identifier IS 'Exact-match filter: hackathon name, course code, etc.';
COMMENT ON COLUMN public.postings.tags IS 'Free-form tags for semantic matching';
COMMENT ON COLUMN public.postings.team_size_min IS 'Minimum number of people needed (default 1)';
COMMENT ON COLUMN public.postings.team_size_max IS 'Maximum number of people needed (default 1)';
COMMENT ON COLUMN public.postings.mode IS 'open = anyone can express interest, friend_ask = sequential friend requests';
COMMENT ON COLUMN public.postings.location_preference IS 'Location preference: 0.0 = in-person only, 0.5 = either, 1.0 = remote only';
COMMENT ON COLUMN public.postings.natural_language_criteria IS 'Free-text criteria stored as pgvector embedding for semantic matching';
COMMENT ON COLUMN public.postings.estimated_time IS 'Free-form time estimate: "2 hours", "10-20h/week"';
COMMENT ON COLUMN public.postings.skill_level_min IS 'Minimum skill level required (0-10 scale)';
COMMENT ON COLUMN public.postings.status IS 'Posting status: open, closed, filled, expired, paused';
COMMENT ON TABLE public.friend_asks IS 'Sequential friend request tracking for friend_ask mode postings';
COMMENT ON TABLE public.friendships IS 'Bidirectional friend relationships between users';
