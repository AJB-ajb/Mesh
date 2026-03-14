-- Add auth.uid() check to vote_on_card RPC to prevent vote impersonation.
-- The RPC is SECURITY DEFINER and accepts p_user_id, so without this check
-- any authenticated user could vote as another user.

CREATE OR REPLACE FUNCTION vote_on_card(
  p_card_id uuid,
  p_user_id uuid,
  p_option_index int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card space_cards;
  v_options jsonb;
  v_option jsonb;
  v_votes jsonb;
  v_idx int;
  v_already_voted boolean;
  v_multi_select boolean;
BEGIN
  -- Lock the row for atomic update
  SELECT * INTO v_card
    FROM space_cards
    WHERE id = p_card_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found';
  END IF;

  IF v_card.status != 'active' THEN
    RAISE EXCEPTION 'Card is not active';
  END IF;

  -- Verify caller matches p_user_id (defense-in-depth)
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot vote as another user';
  END IF;

  -- Verify membership
  IF NOT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = v_card.space_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this space';
  END IF;

  v_options := v_card.data->'options';
  IF v_options IS NULL OR jsonb_array_length(v_options) <= p_option_index THEN
    RAISE EXCEPTION 'Invalid option index';
  END IF;

  -- Determine if multi-select (time_proposal allows multi-select)
  v_multi_select := v_card.type IN ('time_proposal');

  IF v_multi_select THEN
    -- Toggle vote on the specific option only
    v_option := v_options->p_option_index;
    v_votes := COALESCE(v_option->'votes', '[]'::jsonb);
    v_already_voted := v_votes @> to_jsonb(p_user_id::text);

    IF v_already_voted THEN
      v_votes := (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(v_votes) elem
        WHERE elem #>> '{}' != p_user_id::text
      );
      IF v_votes IS NULL THEN v_votes := '[]'::jsonb; END IF;
    ELSE
      v_votes := v_votes || to_jsonb(p_user_id::text);
    END IF;

    v_option := jsonb_set(v_option, '{votes}', v_votes);
    v_options := jsonb_set(v_options, ARRAY[p_option_index::text], v_option);
  ELSE
    -- Single-select: remove from all options, add to target
    FOR v_idx IN 0..jsonb_array_length(v_options) - 1 LOOP
      v_option := v_options->v_idx;
      v_votes := COALESCE(v_option->'votes', '[]'::jsonb);

      IF v_idx = p_option_index THEN
        v_already_voted := v_votes @> to_jsonb(p_user_id::text);
        IF v_already_voted THEN
          v_votes := (
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(v_votes) elem
            WHERE elem #>> '{}' != p_user_id::text
          );
          IF v_votes IS NULL THEN v_votes := '[]'::jsonb; END IF;
        ELSE
          v_votes := v_votes || to_jsonb(p_user_id::text);
        END IF;
      ELSE
        v_votes := (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(v_votes) elem
          WHERE elem #>> '{}' != p_user_id::text
        );
        IF v_votes IS NULL THEN v_votes := '[]'::jsonb; END IF;
      END IF;

      v_option := jsonb_set(v_option, '{votes}', v_votes);
      v_options := jsonb_set(v_options, ARRAY[v_idx::text], v_option);
    END LOOP;
  END IF;

  -- Write back
  UPDATE space_cards
    SET data = jsonb_set(data, '{options}', v_options)
    WHERE id = p_card_id;

  -- Return updated data
  RETURN jsonb_set(v_card.data, '{options}', v_options);
END;
$$;
