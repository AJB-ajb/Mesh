-- Critical review fixes: FK consistency, missing policies, constraints, indexes

-- ---------------------------------------------------------------------------
-- 1. bot_config: add SELECT policy for SECURITY DEFINER functions (documentation)
--    RLS is enabled with no policies — only SECURITY DEFINER functions can access.
--    Add an explicit admin-only SELECT policy so behavior is clearly intentional.
-- ---------------------------------------------------------------------------
CREATE POLICY "bot_config_select_service_only"
  ON bot_config FOR SELECT
  USING (false);
-- The USING(false) blocks all direct client reads. Access remains via
-- SECURITY DEFINER functions only. This makes the intent explicit.

-- ---------------------------------------------------------------------------
-- 2. Fix FK references: bookmarks, github_profiles, space_cards
--    These reference auth.users(id) but should reference profiles(user_id)
--    for consistency with the rest of the schema.
-- ---------------------------------------------------------------------------

-- bookmarks
ALTER TABLE bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
ALTER TABLE bookmarks
  ADD CONSTRAINT bookmarks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- github_profiles
ALTER TABLE github_profiles
  DROP CONSTRAINT IF EXISTS github_profiles_pkey_fkey,
  DROP CONSTRAINT IF EXISTS github_profiles_user_id_fkey;
ALTER TABLE github_profiles
  ADD CONSTRAINT github_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- space_cards
ALTER TABLE space_cards
  DROP CONSTRAINT IF EXISTS space_cards_created_by_fkey;
ALTER TABLE space_cards
  ADD CONSTRAINT space_cards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. space_postings.sub_space_id: add ON DELETE SET NULL
--    Currently defaults to RESTRICT, blocking sub-space deletion.
-- ---------------------------------------------------------------------------
ALTER TABLE space_postings
  DROP CONSTRAINT IF EXISTS space_postings_sub_space_id_fkey;
ALTER TABLE space_postings
  ADD CONSTRAINT space_postings_sub_space_id_fkey
  FOREIGN KEY (sub_space_id) REFERENCES spaces(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. team_size_min >= 1 constraint
--    Existing CHECK ensures max >= min but allows min = 0 or negative.
-- ---------------------------------------------------------------------------
-- The old constraint name varies; drop by inspecting pg_constraint if needed.
-- Use a safe DO block to handle both old and new schemas.
DO $$
BEGIN
  -- Try to add the constraint; if it conflicts with an existing one, drop and re-add.
  BEGIN
    ALTER TABLE postings
      ADD CONSTRAINT postings_team_size_min_positive CHECK (team_size_min >= 1);
  EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists
    NULL;
  END;
END$$;

-- Also add to space_postings if team_size_min column exists there
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'space_postings' AND column_name = 'team_size_min'
  ) THEN
    BEGIN
      ALTER TABLE space_postings
        ADD CONSTRAINT space_postings_team_size_min_positive CHECK (team_size_min >= 1);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 5. Feedback screenshot storage: add DELETE policy for owners
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Only add if the bucket exists and policy doesn't already exist
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'feedback-screenshots') THEN
    -- Allow authenticated users to delete their own uploads
    BEGIN
      CREATE POLICY "feedback_screenshots_delete_own"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'feedback-screenshots'
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 6. Missing indexes for performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_activity_cards_from_user
  ON activity_cards(from_user_id);

CREATE INDEX IF NOT EXISTS idx_space_postings_sub_space
  ON space_postings(sub_space_id)
  WHERE sub_space_id IS NOT NULL;
