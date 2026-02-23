-- Migration: Add get_inbox_conversations() RPC
-- Replaces N+1 queries (profile + posting + last message + unread count per conversation)
-- with a single query using LATERAL joins.

CREATE OR REPLACE FUNCTION get_inbox_conversations(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  participant_1 uuid,
  participant_2 uuid,
  posting_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_user_full_name text,
  other_user_headline text,
  posting_title text,
  last_message_content text,
  last_message_created_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id, c.participant_1, c.participant_2, c.posting_id,
    c.created_at, c.updated_at,
    CASE WHEN c.participant_1 = p_user_id THEN c.participant_2 ELSE c.participant_1 END AS other_user_id,
    p.full_name AS other_user_full_name,
    p.headline AS other_user_headline,
    pt.title AS posting_title,
    lm.content AS last_message_content,
    lm.created_at AS last_message_created_at,
    lm.sender_id AS last_message_sender_id,
    COALESCE(uc.cnt, 0) AS unread_count
  FROM conversations c
  LEFT JOIN profiles p ON p.user_id = CASE
    WHEN c.participant_1 = p_user_id THEN c.participant_2
    ELSE c.participant_1
  END
  LEFT JOIN postings pt ON pt.id = c.posting_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at, m.sender_id
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.read = false
      AND m.sender_id != p_user_id
  ) uc ON true
  WHERE c.participant_1 = p_user_id OR c.participant_2 = p_user_id
  ORDER BY c.updated_at DESC;
$$;

COMMENT ON FUNCTION get_inbox_conversations IS 'Returns enriched conversations for a user: other participant profile, posting title, last message, and unread count. Replaces N+1 client-side queries.';
