-- Fix: accepted team members cannot see postings after status changes from 'open'
-- (e.g. to 'filled'). The previous policy only allowed non-owners to see public
-- postings when status='open', which locked accepted members out of filled postings.
--
-- Add a top-level branch so accepted applicants can always see their postings.

DROP POLICY IF EXISTS "Postings are viewable based on visibility" ON public.postings;

CREATE POLICY "Postings are viewable based on visibility"
  ON public.postings
  FOR SELECT
  USING (
    -- Owner can always see their own postings
    creator_id = auth.uid()
    OR (
      -- Public postings: any authenticated user can view when open
      (COALESCE(visibility, CASE WHEN mode = 'friend_ask' THEN 'private' ELSE 'public' END)) = 'public'
      AND status = 'open'
    )
    OR (
      -- Private postings: user must be invited or an accepted applicant
      (COALESCE(visibility, CASE WHEN mode = 'friend_ask' THEN 'private' ELSE 'public' END)) = 'private'
      AND (
        EXISTS (
          SELECT 1 FROM public.friend_asks fa
          WHERE fa.posting_id = postings.id
          AND auth.uid() = ANY(fa.ordered_friend_list)
        )
        OR public.has_accepted_application(postings.id, auth.uid())
      )
    )
    OR (
      -- Accepted team members can always see their postings regardless of status/visibility
      public.has_accepted_application(postings.id, auth.uid())
    )
  );
