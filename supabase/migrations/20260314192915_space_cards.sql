-- =============================================================================
-- Space Cards — interactive structured messages in the conversation timeline
-- =============================================================================

-- Card types: poll, time_proposal, rsvp, task_claim, location
CREATE TYPE space_card_type AS ENUM (
  'poll',
  'time_proposal',
  'rsvp',
  'task_claim',
  'location'
);

-- Card statuses: active → resolved / cancelled
CREATE TYPE space_card_status AS ENUM (
  'active',
  'resolved',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- space_cards table
-- ---------------------------------------------------------------------------
CREATE TABLE space_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  message_id  uuid REFERENCES space_messages(id) ON DELETE SET NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  type        space_card_type NOT NULL,
  status      space_card_status NOT NULL DEFAULT 'active',
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial index for active cards per space (most common query)
CREATE INDEX idx_space_cards_active
  ON space_cards (space_id)
  WHERE status = 'active';

-- General index for all cards in a space
CREATE INDEX idx_space_cards_space_id ON space_cards (space_id);

-- updated_at trigger (reuse existing function from spaces_rewrite migration)
CREATE TRIGGER trg_space_cards_updated_at
  BEFORE UPDATE ON space_cards
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- FK: space_messages.card_id → space_cards.id
-- ---------------------------------------------------------------------------
ALTER TABLE space_messages
  ADD CONSTRAINT fk_space_messages_card
  FOREIGN KEY (card_id) REFERENCES space_cards(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE space_cards ENABLE ROW LEVEL SECURITY;

-- SELECT: space members can view cards
CREATE POLICY "Space members can view cards"
  ON space_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_cards.space_id
        AND sm.user_id = auth.uid()
    )
  );

-- INSERT: space members can create cards
CREATE POLICY "Space members can create cards"
  ON space_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_cards.space_id
        AND sm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- UPDATE: space members can update cards (votes, resolution)
CREATE POLICY "Space members can update cards"
  ON space_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_cards.space_id
        AND sm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: vote_on_card — atomic vote toggle in jsonb
-- ---------------------------------------------------------------------------
-- Handles poll votes as an atomic toggle:
-- If user already voted for the option, remove their vote.
-- If user voted for a different option (single-select), move their vote.
-- If user hasn't voted, add their vote.
--
-- For multi-select (time_proposal), allows voting on multiple options.
--
-- data.options[i].votes is an array of user_id strings.
-- ---------------------------------------------------------------------------
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
      -- Remove vote
      v_votes := (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(v_votes) elem
        WHERE elem #>> '{}' != p_user_id::text
      );
      IF v_votes IS NULL THEN v_votes := '[]'::jsonb; END IF;
    ELSE
      -- Add vote
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
        -- Toggle on target option
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
        -- Remove from non-target options
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

-- ---------------------------------------------------------------------------
-- Enable realtime for space_cards (UPDATE events for vote changes)
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE space_cards;
