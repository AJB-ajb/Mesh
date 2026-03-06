-- pgTAP tests for profiles RLS policies
-- Policies under test:
--   SELECT: "Profiles are viewable by authenticated users" (any authed user)
--   INSERT: "Profiles can be inserted by the owner"
--   UPDATE: "Profiles can be updated by the owner"

BEGIN;
SELECT plan(7);
SELECT tests.create_test_users();

-- ============================================
-- SELECT: any authenticated user can read any profile
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE user_id = tests.alice()),
  1,
  'Bob can read Alice''s profile'
);

SELECT is(
  (SELECT count(*)::int FROM public.profiles),
  3,
  'Authenticated user can see all profiles'
);

-- Anon cannot read profiles
SELECT tests.clear_authentication();
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.profiles),
  0,
  'Anonymous user cannot see any profiles'
);

-- ============================================
-- INSERT: only owner can create their own profile
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.profiles (user_id, full_name) VALUES ('b0000000-0000-0000-0000-000000000002', 'Imposter')$$,
  NULL,
  'Alice cannot insert a profile for Bob'
);

-- ============================================
-- UPDATE: only owner can update their own profile
-- ============================================

SELECT lives_ok(
  $$UPDATE public.profiles SET full_name = 'Alice Updated' WHERE user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  'Alice can update her own profile'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

-- Bob's UPDATE on Alice's profile should affect 0 rows (RLS filters it out)
UPDATE public.profiles SET full_name = 'Hacked' WHERE user_id = tests.alice();
SELECT is(
  (SELECT full_name FROM public.profiles WHERE user_id = tests.alice()),
  'Alice Updated',
  'Bob cannot update Alice''s profile'
);

-- Verify anon can't update either
SELECT tests.clear_authentication();
SET LOCAL ROLE anon;
UPDATE public.profiles SET full_name = 'Hacked' WHERE user_id = tests.alice();
-- Re-auth to verify the value is unchanged
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT full_name FROM public.profiles WHERE user_id = tests.alice()),
  'Alice Updated',
  'Anonymous cannot update profiles'
);

SELECT * FROM finish();
ROLLBACK;
