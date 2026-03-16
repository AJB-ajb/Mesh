-- Replace app.settings approach with a config table (no superuser needed).
-- Updates the trigger functions to read from bot_config instead.

-- Config table
CREATE TABLE IF NOT EXISTS bot_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Helper to read config
CREATE OR REPLACE FUNCTION get_bot_config(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT value FROM bot_config WHERE key = p_key;
$$;

-- Update message trigger to use config table
CREATE OR REPLACE FUNCTION trg_bot_react_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  secret text;
BEGIN
  IF NEW.type <> 'message' THEN RETURN NEW; END IF;
  IF is_bot_user(NEW.sender_id) THEN RETURN NEW; END IF;

  base_url := get_bot_config('bot_react_url');
  secret := get_bot_config('bot_react_secret');
  IF base_url IS NULL OR secret IS NULL THEN RETURN NEW; END IF;

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

-- Update card trigger to use config table
CREATE OR REPLACE FUNCTION trg_bot_react_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  secret text;
BEGIN
  IF is_bot_user(NEW.created_by) THEN RETURN NEW; END IF;

  base_url := get_bot_config('bot_react_url');
  secret := get_bot_config('bot_react_secret');
  IF base_url IS NULL OR secret IS NULL THEN RETURN NEW; END IF;

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

-- Seed config
INSERT INTO bot_config (key, value) VALUES
  ('bot_react_url', 'https://mesh-dev-test.vercel.app'),
  ('bot_react_secret', 'REDACTED_BOT_SECRET')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
