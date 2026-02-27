-- Migration: compute_match_breakdowns_for_posting
-- Inverse of compute_match_breakdowns_batch: takes one posting and many user_ids
-- instead of one user and many posting_ids. Fixes N+1 in posting-to-profile matching.

CREATE OR REPLACE FUNCTION compute_match_breakdowns_for_posting(
  target_posting_id uuid,
  user_ids uuid[]
)
RETURNS TABLE (
  user_id uuid,
  breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid;
BEGIN
  FOREACH uid IN ARRAY user_ids
  LOOP
    user_id := uid;
    breakdown := compute_match_breakdown(uid, target_posting_id);
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION compute_match_breakdowns_for_posting IS 'Batch compute match breakdowns for a posting against multiple users. Inverse of compute_match_breakdowns_batch.';
