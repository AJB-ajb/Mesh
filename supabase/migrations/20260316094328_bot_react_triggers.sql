-- Migration: Bot reaction triggers (dev-only)
--
-- Fires pg_net HTTP calls to /api/bots/react when messages or cards are
-- inserted, so bot personas can respond automatically on the Vercel
-- preview deployment.
--
-- Setup:
--   1. Insert config row (done at bottom of this migration)
--   2. Set BOT_REACT_SECRET env var on the Vercel project to match
--   3. Update the URL/secret: UPDATE bot_config SET value = '...' WHERE key = '...';
--
-- Safe in production: triggers silently no-op if bot_config table is empty.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- Config table for bot settings
-- ============================================

CREATE TABLE IF NOT EXISTS bot_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- RLS: no public access (only SECURITY DEFINER functions read it)
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper: bot email pattern check
-- ============================================

CREATE OR REPLACE FUNCTION is_bot_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email LIKE 'bot-%@mesh.dev'
  );
$$;

-- ============================================
-- Helper: read bot config
-- ============================================

CREATE OR REPLACE FUNCTION get_bot_config(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT value FROM bot_config WHERE key = p_key;
$$;

-- ============================================
-- Trigger function: react to new messages
-- ============================================

CREATE OR REPLACE FUNCTION trg_bot_react_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  secret text;
BEGIN
  -- Only fire for regular text messages (not cards, postings, etc.)
  IF NEW.type <> 'message' THEN
    RETURN NEW;
  END IF;

  -- Skip bot senders (loop prevention)
  IF is_bot_user(NEW.sender_id) THEN
    RETURN NEW;
  END IF;

  -- Read config from table — silently skip if not configured
  base_url := get_bot_config('bot_react_url');
  secret := get_bot_config('bot_react_secret');

  IF base_url IS NULL OR base_url = '' OR secret IS NULL OR secret = '' THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP call to the bot react endpoint
  PERFORM net.http_post(
    url := base_url || '/api/bots/react',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object(
      'type', 'message',
      'record', jsonb_build_object(
        'id', NEW.id,
        'space_id', NEW.space_id,
        'sender_id', NEW.sender_id,
        'content', NEW.content,
        'type', NEW.type,
        'created_at', NEW.created_at
      )
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- Trigger function: react to new cards
-- ============================================

CREATE OR REPLACE FUNCTION trg_bot_react_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  secret text;
BEGIN
  -- Skip bot-created cards
  IF is_bot_user(NEW.created_by) THEN
    RETURN NEW;
  END IF;

  -- Read config from table
  base_url := get_bot_config('bot_react_url');
  secret := get_bot_config('bot_react_secret');

  IF base_url IS NULL OR base_url = '' OR secret IS NULL OR secret = '' THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP call
  PERFORM net.http_post(
    url := base_url || '/api/bots/react',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object(
      'type', 'card',
      'record', jsonb_build_object(
        'id', NEW.id,
        'space_id', NEW.space_id,
        'created_by', NEW.created_by,
        'type', NEW.type,
        'status', NEW.status,
        'data', NEW.data,
        'created_at', NEW.created_at
      )
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- Attach triggers
-- ============================================

DROP TRIGGER IF EXISTS trg_bot_react_on_message ON space_messages;
CREATE TRIGGER trg_bot_react_on_message
  AFTER INSERT ON space_messages
  FOR EACH ROW
  EXECUTE FUNCTION trg_bot_react_message();

DROP TRIGGER IF EXISTS trg_bot_react_on_card ON space_cards;
CREATE TRIGGER trg_bot_react_on_card
  AFTER INSERT ON space_cards
  FOR EACH ROW
  EXECUTE FUNCTION trg_bot_react_card();

-- ============================================
-- Seed config for dev deployment
-- ============================================

INSERT INTO bot_config (key, value) VALUES
  ('bot_react_url', 'https://mesh-dev-test.vercel.app'),
  ('bot_react_secret', 'REDACTED_BOT_SECRET')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
