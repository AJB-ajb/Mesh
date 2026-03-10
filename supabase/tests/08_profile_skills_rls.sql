-- pgTAP tests for profile_skills RLS policies
-- Bug context: profile_skills has owner-only SELECT, but the public profile
-- page joins profiles → profile_skills. When user B visits user A's profile,
-- the join fails silently and the page returns 404.
--
-- Policies under test:
--   SELECT: should allow any authenticated user (needed for public profiles)
--   INSERT: owner only (profile_id = auth.uid())
--   UPDATE: owner only
--   DELETE: owner only

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(9);
SELECT tests.create_test_users();

-- Seed: Alice has two skills
-- Use a known skill_node (insert one if needed)
INSERT INTO public.skill_nodes (id, name)
VALUES ('d0000000-0000-0000-0000-000000000001', 'TypeScript')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.skill_nodes (id, name)
VALUES ('d0000000-0000-0000-0000-000000000002', 'React')
ON CONFLICT (id) DO NOTHING;

-- Alice's profile skills (inserted as superuser — bypasses RLS)
INSERT INTO public.profile_skills (profile_id, skill_id, level)
VALUES
  (tests.alice(), 'd0000000-0000-0000-0000-000000000001', 8),
  (tests.alice(), 'd0000000-0000-0000-0000-000000000002', 7);

-- ============================================
-- SELECT: any authenticated user can read any profile's skills
-- (Required for public profile pages to work)
-- ============================================

-- Alice can see her own skills
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.profile_skills WHERE profile_id = tests.alice()),
  2,
  'Alice can see her own profile skills'
);

-- Bob can see Alice's skills (cross-user — this is the bug)
SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.profile_skills WHERE profile_id = tests.alice()),
  2,
  'Bob can see Alice''s profile skills (public profile view)'
);

-- Carol can also see Alice's skills
SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.profile_skills WHERE profile_id = tests.alice()),
  2,
  'Carol can see Alice''s profile skills (public profile view)'
);

-- Anon cannot see any profile skills
SELECT tests.clear_authentication();
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.profile_skills),
  0,
  'Anonymous user cannot see any profile skills'
);

-- ============================================
-- The real-world query: profile + joined skills (what the page does)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.profiles p
   LEFT JOIN public.profile_skills ps ON ps.profile_id = p.user_id
   WHERE p.user_id = tests.alice()),
  2,
  'Bob can query Alice''s profile joined with profile_skills (public profile page query)'
);

-- ============================================
-- INSERT: only owner can add their own skills
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.profile_skills (profile_id, skill_id, level)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 5)$$,
  NULL,
  'Bob cannot insert skills for Alice''s profile'
);

-- ============================================
-- UPDATE: only owner can update their own skills
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

UPDATE public.profile_skills SET level = 1 WHERE profile_id = tests.alice();
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT level FROM public.profile_skills
   WHERE profile_id = tests.alice() AND skill_id = 'd0000000-0000-0000-0000-000000000001'),
  8,
  'Bob cannot update Alice''s profile skills'
);

-- ============================================
-- DELETE: only owner can delete their own skills
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

DELETE FROM public.profile_skills WHERE profile_id = tests.alice();
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.profile_skills WHERE profile_id = tests.alice()),
  2,
  'Bob cannot delete Alice''s profile skills'
);

-- Alice CAN delete her own
SELECT lives_ok(
  $$DELETE FROM public.profile_skills
    WHERE profile_id = 'a0000000-0000-0000-0000-000000000001'
    AND skill_id = 'd0000000-0000-0000-0000-000000000002'$$,
  'Alice can delete her own profile skills'
);

SELECT * FROM finish();
ROLLBACK;
