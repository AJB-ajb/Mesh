-- Hotfix: the previous migration (20260221100000) caused infinite recursion
-- because the postings RLS policy references applications, and the applications
-- RLS policy references postings. Fix by using a SECURITY DEFINER helper
-- function that bypasses RLS when checking accepted applications.

-- 1. Create helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_accepted_application(
  p_posting_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications
    WHERE posting_id = p_posting_id
    AND applicant_id = p_user_id
    AND status = 'accepted'
  );
$$;

-- 2. Drop the broken policy
DROP POLICY IF EXISTS "Postings are viewable based on visibility" ON public.postings;

-- 3. Recreate with the helper function instead of direct subquery
CREATE POLICY "Postings are viewable based on visibility"
  ON public.postings
  FOR SELECT
  USING (
    -- Owner can always see their own postings
    creator_id = auth.uid()
    OR (
      -- Public postings: any authenticated user can view
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
        -- User has an accepted application (via SECURITY DEFINER to avoid recursion)
        public.has_accepted_application(postings.id, auth.uid())
      )
    )
  );
