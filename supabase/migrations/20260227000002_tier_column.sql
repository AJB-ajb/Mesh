-- Add tier column to profiles for premium/free user distinction
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'premium'));

COMMENT ON COLUMN profiles.tier IS 'User subscription tier: free or premium. Controls access to features like deep match explanations.';
