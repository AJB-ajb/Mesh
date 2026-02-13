-- Track which records need embedding (re)generation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS needs_embedding boolean NOT NULL DEFAULT true;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS needs_embedding boolean NOT NULL DEFAULT true;

-- Track last embedding generation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz;

-- Trigger: set needs_embedding = true on relevant profile content changes
CREATE OR REPLACE FUNCTION mark_profile_needs_embedding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bio IS DISTINCT FROM OLD.bio
    OR NEW.skills IS DISTINCT FROM OLD.skills
    OR NEW.interests IS DISTINCT FROM OLD.interests
    OR NEW.headline IS DISTINCT FROM OLD.headline
  THEN
    NEW.needs_embedding := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_content_changed
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION mark_profile_needs_embedding();

-- Trigger: set needs_embedding = true on relevant posting content changes
CREATE OR REPLACE FUNCTION mark_posting_needs_embedding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.skills IS DISTINCT FROM OLD.skills
  THEN
    NEW.needs_embedding := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posting_content_changed
  BEFORE UPDATE ON postings
  FOR EACH ROW
  EXECUTE FUNCTION mark_posting_needs_embedding();
