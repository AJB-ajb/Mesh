-- Fix: allow invitees to update friend_asks (accept/decline)
-- Previously only the creator had UPDATE access via the FOR ALL policy.
-- Invitees could read (via FOR SELECT) but not update, causing
-- "Failed to read back updated invite" errors in the respond API.

CREATE POLICY "Invitees can respond to friend asks"
  ON public.friend_asks
  FOR UPDATE
  USING (auth.uid() = ANY(ordered_friend_list))
  WITH CHECK (auth.uid() = ANY(ordered_friend_list));

-- Prevent invitees from modifying columns they shouldn't touch.
-- Only status, declined_list, pending_invitees, current_request_index
-- are legitimate update targets. creator_id, posting_id, and
-- ordered_friend_list must remain immutable for non-creators.
CREATE OR REPLACE FUNCTION public.guard_friend_ask_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Creators (covered by the FOR ALL policy) can update anything
  IF OLD.creator_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Invitees: block changes to ownership / structural columns
  IF NEW.creator_id    IS DISTINCT FROM OLD.creator_id
  OR NEW.posting_id    IS DISTINCT FROM OLD.posting_id
  OR NEW.ordered_friend_list IS DISTINCT FROM OLD.ordered_friend_list
  THEN
    RAISE EXCEPTION 'invitees cannot modify creator_id, posting_id, or ordered_friend_list';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_friend_ask_update
  BEFORE UPDATE ON public.friend_asks
  FOR EACH ROW EXECUTE FUNCTION public.guard_friend_ask_update();
