-- Fix: allow invitees to update friend_asks (accept/decline)
-- Previously only the creator had UPDATE access via the FOR ALL policy.
-- Invitees could read (via FOR SELECT) but not update, causing
-- "Failed to read back updated invite" errors in the respond API.

CREATE POLICY "Invitees can respond to friend asks"
  ON public.friend_asks
  FOR UPDATE
  USING (auth.uid() = ANY(ordered_friend_list))
  WITH CHECK (auth.uid() = ANY(ordered_friend_list));
