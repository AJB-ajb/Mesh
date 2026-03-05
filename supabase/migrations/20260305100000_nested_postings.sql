-- Nested Postings: add parent_posting_id FK to postings table
-- A posting can be a child of another posting, inheriting its context.
-- See spec/nested-postings.md for full design.

ALTER TABLE public.postings
  ADD COLUMN parent_posting_id uuid REFERENCES public.postings(id) ON DELETE CASCADE;

-- Partial index: only index rows that actually have a parent
CREATE INDEX idx_postings_parent_posting_id ON public.postings(parent_posting_id)
  WHERE parent_posting_id IS NOT NULL;

-- Helper: check if current user is a member of a posting's context
-- (creator or accepted applicant of the posting or its direct parent)
CREATE OR REPLACE FUNCTION is_context_member(p_posting_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.postings p
    WHERE p.id = p_posting_id
    AND (
      -- User is creator of this posting
      p.creator_id = auth.uid()
      -- User has an accepted application on this posting
      OR EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.posting_id = p.id
          AND a.applicant_id = auth.uid()
          AND a.status = 'accepted'
      )
      -- User is a member of the parent posting
      OR (p.parent_posting_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.postings parent
          WHERE parent.id = p.parent_posting_id
          AND (
            parent.creator_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.applications a2
              WHERE a2.posting_id = parent.id
                AND a2.applicant_id = auth.uid()
                AND a2.status = 'accepted'
            )
          )
        )
      ))
    )
  );
$$;

COMMENT ON FUNCTION is_context_member IS 'Returns true if the current auth user is a context member of the given posting (creator, accepted applicant, or member of parent posting).';

-- RLS: parent context members can view child postings
CREATE POLICY "Context members can view child postings"
  ON public.postings FOR SELECT
  USING (parent_posting_id IS NOT NULL AND is_context_member(id));
