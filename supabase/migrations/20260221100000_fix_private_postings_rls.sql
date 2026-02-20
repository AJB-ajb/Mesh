-- Fix private postings RLS: restrict visibility of private postings
-- Previously the "Open postings are viewable" policy allowed any authenticated
-- user to see any posting with status='open'. Private postings should only be
-- visible to the owner, invited users, or accepted applicants.
--
-- NOTE: This migration had infinite recursion (postings RLS → applications RLS → postings RLS).
-- Fixed in 20260221110000_fix_private_postings_rls_recursion.sql

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Open postings are viewable" ON public.postings;

-- Create a new policy that checks visibility
CREATE POLICY "Postings are viewable based on visibility"
  ON public.postings
  FOR SELECT
  USING (
    -- Owner can always see their own postings
    creator_id = auth.uid()
    OR (
      -- Public postings (or postings without visibility set that are 'open' mode):
      -- any authenticated user can view
      (COALESCE(visibility, CASE WHEN mode = 'friend_ask' THEN 'private' ELSE 'public' END)) = 'public'
      AND status = 'open'
    )
    OR (
      -- Private postings: user must be invited or an accepted applicant
      (COALESCE(visibility, CASE WHEN mode = 'friend_ask' THEN 'private' ELSE 'public' END)) = 'private'
      AND (
        -- User is in an invite list for this posting
        EXISTS (
          SELECT 1 FROM public.friend_asks fa
          WHERE fa.posting_id = postings.id
          AND auth.uid() = ANY(fa.ordered_friend_list)
        )
        OR
        -- User has an accepted application
        EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.posting_id = postings.id
          AND a.applicant_id = auth.uid()
          AND a.status = 'accepted'
        )
      )
    )
  );
