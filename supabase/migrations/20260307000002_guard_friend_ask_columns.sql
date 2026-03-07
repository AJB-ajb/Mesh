-- Guard structural columns on friend_asks from invitee modification.
-- Invitees (in ordered_friend_list) can update status/declined_list/etc
-- but must not change creator_id, posting_id, or ordered_friend_list.

CREATE OR REPLACE FUNCTION public.guard_friend_ask_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.creator_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.creator_id    IS DISTINCT FROM OLD.creator_id
  OR NEW.posting_id    IS DISTINCT FROM OLD.posting_id
  OR NEW.ordered_friend_list IS DISTINCT FROM OLD.ordered_friend_list
  THEN
    RAISE EXCEPTION 'invitees cannot modify creator_id, posting_id, or ordered_friend_list';
  END IF;

  RETURN NEW;
END;
$$;

-- DROP first in case the trigger was applied manually or via local testing
DROP TRIGGER IF EXISTS guard_friend_ask_update ON public.friend_asks;
CREATE TRIGGER guard_friend_ask_update
  BEFORE UPDATE ON public.friend_asks
  FOR EACH ROW EXECUTE FUNCTION public.guard_friend_ask_update();
