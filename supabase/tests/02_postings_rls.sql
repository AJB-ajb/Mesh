-- pgTAP tests for postings RLS policies
-- Policies under test:
--   SELECT: "Postings are viewable based on visibility" (latest: fix_filled_posting_visibility)
--           "Context members can view child postings" (nested_postings)
--   INSERT: "Users can create postings"
--   UPDATE: "Creators can update own postings"
--   DELETE: "Creators can delete own postings"

BEGIN;
SELECT plan(15);
SELECT tests.create_test_users();

-- ============================================
-- Seed test postings (as superuser)
-- ============================================

-- Public open posting by Alice
INSERT INTO public.postings (id, creator_id, title, description, status, visibility, mode, is_test_data, expires_at)
VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  tests.alice(), 'Public Open', 'A public open posting', 'open', 'public', 'open', true, now() + interval '30 days'
);

-- Public filled posting by Alice
INSERT INTO public.postings (id, creator_id, title, description, status, visibility, mode, is_test_data, expires_at)
VALUES (
  '10000000-0000-0000-0000-000000000002'::uuid,
  tests.alice(), 'Public Filled', 'A filled posting', 'filled', 'public', 'open', true, now() + interval '30 days'
);

-- Private posting by Alice (friend_ask mode)
INSERT INTO public.postings (id, creator_id, title, description, status, visibility, mode, is_test_data, expires_at)
VALUES (
  '10000000-0000-0000-0000-000000000003'::uuid,
  tests.alice(), 'Private Invite', 'A private posting', 'open', 'private', 'friend_ask', true, now() + interval '30 days'
);

-- Friend ask: Bob is in the invite list
INSERT INTO public.friend_asks (id, posting_id, creator_id, ordered_friend_list)
VALUES (
  '20000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000003'::uuid,
  tests.alice(),
  ARRAY[tests.bob()]
);

-- Application: Bob has accepted application on the filled posting
INSERT INTO public.applications (id, posting_id, applicant_id, status)
VALUES (
  '30000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  tests.bob(),
  'accepted'
);

-- ============================================
-- SELECT: public open postings visible to any authenticated user
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Carol (unrelated user) can see public open posting'
);

-- ============================================
-- SELECT: public filled postings NOT visible to unrelated users
-- ============================================

SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000002'),
  0,
  'Carol cannot see public filled posting (not open, not a team member)'
);

-- ============================================
-- SELECT: filled posting visible to accepted team member (the bug that was fixed)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000002'),
  1,
  'Bob (accepted applicant) can see filled posting'
);

-- ============================================
-- SELECT: owner always sees their postings regardless of status
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE creator_id = tests.alice()),
  3,
  'Alice (owner) sees all her postings regardless of status/visibility'
);

-- ============================================
-- SELECT: private posting visible only to invited users
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000003'),
  1,
  'Bob (in invite list) can see private posting'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000003'),
  0,
  'Carol (not invited) cannot see private posting'
);

-- ============================================
-- SELECT: anonymous cannot see any postings
-- ============================================

SELECT tests.clear_authentication();
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.postings),
  0,
  'Anonymous user cannot see any postings'
);

-- ============================================
-- INSERT: user can create postings as themselves
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.postings (id, creator_id, title, description, status, is_test_data, expires_at)
    VALUES ('10000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000002', 'Bob Post', 'test', 'open', true, now() + interval '30 days')$$,
  'Bob can create a posting as himself'
);

SELECT throws_ok(
  $$INSERT INTO public.postings (id, creator_id, title, description, status, is_test_data, expires_at)
    VALUES ('10000000-0000-0000-0000-000000000098', 'a0000000-0000-0000-0000-000000000001', 'Imposter', 'test', 'open', true, now() + interval '30 days')$$,
  NULL,
  'Bob cannot create a posting as Alice'
);

-- ============================================
-- UPDATE: only creator can update their posting
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.postings SET title = 'Updated' WHERE id = '10000000-0000-0000-0000-000000000001'$$,
  'Alice can update her own posting'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

UPDATE public.postings SET title = 'Hacked' WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT title FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000001'),
  'Updated',
  'Bob cannot update Alice''s posting'
);

-- ============================================
-- DELETE: only creator can delete their posting
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

DELETE FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Bob cannot delete Alice''s posting'
);

-- ============================================
-- Nested postings: context member visibility
-- ============================================

-- Reset to superuser for seeding
RESET ROLE;

-- Create a PRIVATE child posting — visibility='private' so the only way non-owners see it
-- is through the "Context members can view child postings" policy.
INSERT INTO public.postings (id, creator_id, title, description, status, visibility, parent_posting_id, is_test_data, expires_at, mode)
VALUES (
  '10000000-0000-0000-0000-000000000010'::uuid,
  tests.alice(), 'Child Task', 'Sub-task', 'open', 'private',
  '10000000-0000-0000-0000-000000000001'::uuid, true, now() + interval '30 days', 'friend_ask'
);

-- Alice is the creator — she should see the child
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000010'),
  1,
  'Alice (parent creator) can see child posting'
);

-- Add accepted application for Bob on the parent posting
RESET ROLE;
INSERT INTO public.applications (id, posting_id, applicant_id, status)
VALUES (
  '30000000-0000-0000-0000-000000000010'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  tests.bob(),
  'accepted'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000010'),
  1,
  'Bob (accepted on parent) can see child posting'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.postings WHERE id = '10000000-0000-0000-0000-000000000010'),
  0,
  'Carol (no context membership) cannot see child posting'
);

SELECT * FROM finish();
ROLLBACK;
