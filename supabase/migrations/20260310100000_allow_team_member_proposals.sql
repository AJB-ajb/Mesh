-- Allow any team member (not just the posting owner) to create meeting proposals.
-- Matches the updated API-level authorization in the proposals POST route.

DROP POLICY "Posting owner can create proposals" ON meeting_proposals;

CREATE POLICY "Team members can create proposals"
  ON meeting_proposals FOR INSERT
  WITH CHECK (
    is_posting_team_member(posting_id, auth.uid())
    AND proposed_by = auth.uid()
  );
