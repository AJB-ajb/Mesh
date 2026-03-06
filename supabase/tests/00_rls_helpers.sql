-- Helper utilities for pgTAP RLS tests
-- Sets up test users and common fixtures used across all RLS test files.

BEGIN;
SELECT plan(1);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA tests GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;

-- Create test users in auth.users (Supabase's auth schema)
-- We need real auth users so auth.uid() works in RLS policies.

CREATE OR REPLACE FUNCTION tests.create_test_users()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- User A: posting creator
  INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
  VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'alice@test.com',
    '{"full_name": "Alice Test"}'::jsonb,
    now(), now(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- User B: applicant / other user
  INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
  VALUES (
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'bob@test.com',
    '{"full_name": "Bob Test"}'::jsonb,
    now(), now(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- User C: uninvolved bystander
  INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
  VALUES (
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'carol@test.com',
    '{"full_name": "Carol Test"}'::jsonb,
    now(), now(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create profiles for each user
  INSERT INTO public.profiles (user_id, full_name)
  VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Alice Test'),
    ('b0000000-0000-0000-0000-000000000002', 'Bob Test'),
    ('c0000000-0000-0000-0000-000000000003', 'Carol Test')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Authenticate as a specific test user (sets JWT claims only — caller must SET LOCAL ROLE)
CREATE OR REPLACE FUNCTION tests.authenticate_as(user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
END;
$$;

-- Clear JWT claims (caller must SET LOCAL ROLE anon)
CREATE OR REPLACE FUNCTION tests.clear_authentication()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$$;

-- Shorthand user IDs
CREATE OR REPLACE FUNCTION tests.alice() RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT 'a0000000-0000-0000-0000-000000000001'::uuid;
$$;

CREATE OR REPLACE FUNCTION tests.bob() RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT 'b0000000-0000-0000-0000-000000000002'::uuid;
$$;

CREATE OR REPLACE FUNCTION tests.carol() RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT 'c0000000-0000-0000-0000-000000000003'::uuid;
$$;

-- Grant execute on all test helper functions to roles used during tests
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, anon;

SELECT pass('RLS test helpers installed');
SELECT * FROM finish();
COMMIT;
