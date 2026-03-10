-- Fix profile_skills RLS: allow any authenticated user to read any profile's skills.
-- Bug: The public profile page (/profile/[userId]) joins profiles → profile_skills,
-- but the SELECT policy was owner-only (profile_id = auth.uid()). When user B visits
-- user A's profile, the join returns no skills and the page falls through to notFound().
--
-- This aligns profile_skills with posting_skills, which already has a permissive
-- "viewable by authenticated users" SELECT policy.

DROP POLICY "Users can view their own profile skills" ON public.profile_skills;

CREATE POLICY "Profile skills are viewable by authenticated users"
  ON public.profile_skills
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
