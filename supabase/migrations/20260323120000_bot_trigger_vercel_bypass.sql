-- Add Vercel deployment protection bypass header to bot trigger functions.
-- Reads 'vercel_bypass_secret' from bot_config; if set, appends the
-- x-vercel-protection-bypass header so pg_net requests reach the API.

-- Seed the bypass token (idempotent)
INSERT INTO bot_config (key, value) VALUES
  ('vercel_bypass_secret', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION trg_bot_react_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  secret text;
  bypass_token text;
  req_headers jsonb;
BEGIN
  IF NEW.type <> 'message' THEN
    RETURN NEW;
  END IF;

  IF is_bot_user(NEW.sender_id) THEN
    RETURN NEW;
  END IF;

  base_url := get_bot_config('bot_react_url');
  secret := get_bot_config('bot_react_secret');

  IF base_url IS NULL OR base_url = '' OR secret IS NULL OR secret = '' THEN
    RETURN NEW;
  END IF;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || secret
  );

  bypass_token := get_bot_config('vercel_bypass_secret');
  IF bypass_token IS NOT NULL AND bypass_token <> '' THEN
    req_headers := req_headers || jsonb_build_object('x-vercel-protection-bypass', bypass_token);
  END IF;

  PERFORM net.http_post(
    url := base_url || '/api/bots/react',
    headers := req_headers,
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

CREATE OR REPLACE FUNCTION trg_bot_react_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  secret text;
  bypass_token text;
  req_headers jsonb;
BEGIN
  IF is_bot_user(NEW.created_by) THEN
    RETURN NEW;
  END IF;

  base_url := get_bot_config('bot_react_url');
  secret := get_bot_config('bot_react_secret');

  IF base_url IS NULL OR base_url = '' OR secret IS NULL OR secret = '' THEN
    RETURN NEW;
  END IF;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || secret
  );

  bypass_token := get_bot_config('vercel_bypass_secret');
  IF bypass_token IS NOT NULL AND bypass_token <> '' THEN
    req_headers := req_headers || jsonb_build_object('x-vercel-protection-bypass', bypass_token);
  END IF;

  PERFORM net.http_post(
    url := base_url || '/api/bots/react',
    headers := req_headers,
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
