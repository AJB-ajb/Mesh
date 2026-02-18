-- Migration: Drop old skill columns (contract phase)
-- Prerequisite: PR 2 merged, batch migration script run on dev and prod.
-- All code now reads from profile_skills/posting_skills join tables.

-- ============================================
-- 1. DROP OLD COLUMNS
-- ============================================

ALTER TABLE profiles DROP COLUMN IF EXISTS skills;
ALTER TABLE profiles DROP COLUMN IF EXISTS skill_levels;
ALTER TABLE postings DROP COLUMN IF EXISTS skills;
ALTER TABLE postings DROP COLUMN IF EXISTS skill_level_min;

-- ============================================
-- 2. UPDATE EMBEDDING TRIGGERS
-- The old triggers referenced the `skills` column. Replace with triggers
-- on the join tables so skills changes still mark needs_embedding = true.
-- ============================================

-- Update profile trigger to not reference `skills` column
CREATE OR REPLACE FUNCTION mark_profile_needs_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.interests IS DISTINCT FROM NEW.interests OR
    OLD.headline IS DISTINCT FROM NEW.headline
  ) THEN
    NEW.needs_embedding := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Update posting trigger to not reference `skills` column
CREATE OR REPLACE FUNCTION mark_posting_needs_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.tags IS DISTINCT FROM NEW.tags
  ) THEN
    NEW.needs_embedding := true;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. ADD JOIN TABLE TRIGGERS FOR EMBEDDING
-- When profile_skills or posting_skills change, mark parent for re-embedding.
-- ============================================

CREATE OR REPLACE FUNCTION mark_profile_needs_embedding_on_skill_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE profiles SET needs_embedding = true WHERE user_id = OLD.profile_id;
    RETURN OLD;
  ELSE
    UPDATE profiles SET needs_embedding = true WHERE user_id = NEW.profile_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_skills_embedding ON profile_skills;
CREATE TRIGGER trg_profile_skills_embedding
  AFTER INSERT OR UPDATE OR DELETE ON profile_skills
  FOR EACH ROW
  EXECUTE FUNCTION mark_profile_needs_embedding_on_skill_change();

CREATE OR REPLACE FUNCTION mark_posting_needs_embedding_on_skill_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE postings SET needs_embedding = true WHERE id = OLD.posting_id;
    RETURN OLD;
  ELSE
    UPDATE postings SET needs_embedding = true WHERE id = NEW.posting_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_posting_skills_embedding ON posting_skills;
CREATE TRIGGER trg_posting_skills_embedding
  AFTER INSERT OR UPDATE OR DELETE ON posting_skills
  FOR EACH ROW
  EXECUTE FUNCTION mark_posting_needs_embedding_on_skill_change();
