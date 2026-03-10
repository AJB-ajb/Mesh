-- Fix: public open postings were readable by anonymous users because the
-- public+open branch of the SELECT policy had no auth.uid() check.
-- Add auth.uid() IS NOT NULL gate so only authenticated users can browse.

DROP POLICY IF EXISTS "Postings are viewable based on visibility" ON public.postings;

CREATE POLICY "Postings are viewable based on visibility"
  ON public.postings
  FOR SELECT
  USING (
    -- Owner can always see their own postings
    creator_id = auth.uid()
    OR (
      -- Public postings: any authenticated user can view when open
      auth.uid() IS NOT NULL
      AND (COALESCE(visibility, CASE WHEN mode = 'friend_ask' THEN 'private' ELSE 'public' END)) = 'public'
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
