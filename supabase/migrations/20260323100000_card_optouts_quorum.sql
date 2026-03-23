-- Add opt_outs column for explicit card opt-outs (Can't make any / Pass)
ALTER TABLE space_cards ADD COLUMN IF NOT EXISTS opt_outs jsonb DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- RPC: opt_out_card — allows a user to opt out of a card
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION opt_out_card(
  p_card_id uuid,
  p_user_id uuid,
  p_reason text  -- 'cant_make_any' or 'pass'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card space_cards;
  v_opt_outs jsonb;
  v_options jsonb;
  v_option jsonb;
  v_votes jsonb;
  v_idx int;
BEGIN
  SELECT * INTO v_card FROM space_cards WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF v_card.status != 'active' THEN RAISE EXCEPTION 'Card is not active'; END IF;
  IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Cannot opt out as another user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM space_members WHERE space_id = v_card.space_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Not a member of this space';
  END IF;
  IF p_reason NOT IN ('cant_make_any', 'pass') THEN
    RAISE EXCEPTION 'Invalid opt-out reason';
  END IF;

  -- Remove existing opt-out entry for this user (if changing reason)
  v_opt_outs := COALESCE(v_card.opt_outs, '[]'::jsonb);
  v_opt_outs := (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(v_opt_outs) elem
    WHERE elem->>'user_id' != p_user_id::text
  );

  -- Add new opt-out entry
  v_opt_outs := v_opt_outs || jsonb_build_object('user_id', p_user_id::text, 'reason', p_reason);

  -- Remove user from all option votes (clean state)
  v_options := v_card.data->'options';
  IF v_options IS NOT NULL THEN
    FOR v_idx IN 0..jsonb_array_length(v_options) - 1 LOOP
      v_option := v_options->v_idx;
      v_votes := COALESCE(v_option->'votes', '[]'::jsonb);
      v_votes := (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(v_votes) elem
        WHERE elem #>> '{}' != p_user_id::text
      );
      v_option := jsonb_set(v_option, '{votes}', v_votes);
      v_options := jsonb_set(v_options, ARRAY[v_idx::text], v_option);
    END LOOP;
  END IF;

  UPDATE space_cards
    SET opt_outs = v_opt_outs,
        data = jsonb_set(data, '{options}', v_options)
    WHERE id = p_card_id;

  RETURN jsonb_build_object('opt_outs', v_opt_outs, 'options', v_options);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: undo_opt_out — removes a user's opt-out
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION undo_opt_out(
  p_card_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card space_cards;
  v_opt_outs jsonb;
BEGIN
  SELECT * INTO v_card FROM space_cards WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF v_card.status != 'active' THEN RAISE EXCEPTION 'Card is not active'; END IF;
  IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Cannot undo opt-out as another user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM space_members WHERE space_id = v_card.space_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Not a member of this space';
  END IF;

  v_opt_outs := COALESCE(v_card.opt_outs, '[]'::jsonb);
  v_opt_outs := (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(v_opt_outs) elem
    WHERE elem->>'user_id' != p_user_id::text
  );

  UPDATE space_cards SET opt_outs = v_opt_outs WHERE id = p_card_id;

  RETURN jsonb_build_object('opt_outs', v_opt_outs);
END;
$$;
