-- pgTAP tests for friendships and friend_asks RLS policies

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(14);
SELECT tests.create_test_users();

-- Seed: Alice sends friend request to Bob
INSERT INTO public.friendships (id, user_id, friend_id, status)
VALUES ('70000000-0000-0000-0000-000000000001', tests.alice(), tests.bob(), 'pending');

-- Seed: posting + friend_ask by Alice, Bob is in invite list
INSERT INTO public.postings (id, creator_id, title, description, status, visibility, mode, is_test_data, expires_at)
VALUES ('10000000-0000-0000-0000-000000000001', tests.alice(), 'Invite Post', 'test', 'open', 'private', 'friend_ask', true, now() + interval '30 days');

INSERT INTO public.friend_asks (id, posting_id, creator_id, ordered_friend_list)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', tests.alice(), ARRAY[tests.bob()]);

-- ============================================
-- Friendships SELECT: both sides can see
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.friendships WHERE id = '70000000-0000-0000-0000-000000000001'),
  1,
  'Alice (initiator) can see friendship'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.friendships WHERE id = '70000000-0000-0000-0000-000000000001'),
  1,
  'Bob (recipient) can see friendship'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.friendships),
  0,
  'Carol cannot see Alice-Bob friendship'
);

-- ============================================
-- Friendships INSERT: only as initiator
-- ============================================

SELECT throws_ok(
  $$INSERT INTO public.friendships (user_id, friend_id, status) VALUES ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'pending')$$,
  NULL,
  'Bob cannot create a friendship request as Alice'
);

-- ============================================
-- Friendships UPDATE: both sides can update (accept/decline)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.friendships SET status = 'accepted' WHERE id = '70000000-0000-0000-0000-000000000001'$$,
  'Bob (recipient) can accept the friendship'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
UPDATE public.friendships SET status = 'blocked' WHERE id = '70000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT status FROM public.friendships WHERE id = '70000000-0000-0000-0000-000000000001'),
  'accepted',
  'Carol cannot update Alice-Bob friendship'
);

-- ============================================
-- Friendships DELETE: only initiator
-- ============================================

DELETE FROM public.friendships WHERE id = '70000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.friendships WHERE id = '70000000-0000-0000-0000-000000000001'),
  1,
  'Bob (recipient) cannot delete the friendship — only initiator can'
);

-- ============================================
-- Friend asks SELECT: creator sees their own
-- ============================================

SELECT is(
  (SELECT count(*)::int FROM public.friend_asks WHERE id = '20000000-0000-0000-0000-000000000001'),
  1,
  'Alice (creator) can see her friend_ask'
);

-- Friend in the invite list can also see it
SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.friend_asks WHERE id = '20000000-0000-0000-0000-000000000001'),
  1,
  'Bob (in ordered_friend_list) can see the friend_ask'
);

-- Unrelated user cannot see it
SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.friend_asks),
  0,
  'Carol cannot see any friend_asks'
);

-- ============================================
-- Friend asks UPDATE: invitee can update (accept/decline)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.friend_asks SET status = 'accepted' WHERE id = '20000000-0000-0000-0000-000000000001'$$,
  'Bob (invitee in ordered_friend_list) can update friend_ask status'
);

SELECT is(
  (SELECT status FROM public.friend_asks WHERE id = '20000000-0000-0000-0000-000000000001'),
  'accepted',
  'Bob update actually changed the status to accepted'
);

-- Reset status for next test
SELECT tests.clear_authentication();
RESET ROLE;
UPDATE public.friend_asks SET status = 'pending' WHERE id = '20000000-0000-0000-0000-000000000001';

-- Outsider cannot update
SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
UPDATE public.friend_asks SET status = 'cancelled' WHERE id = '20000000-0000-0000-0000-000000000001';

-- Verify status unchanged (Carol's update was silently dropped by RLS)
SELECT tests.clear_authentication();
RESET ROLE;
SELECT is(
  (SELECT status FROM public.friend_asks WHERE id = '20000000-0000-0000-0000-000000000001'),
  'pending',
  'Carol (outsider) cannot update friend_ask — status unchanged'
);

-- ============================================
-- Friend asks UPDATE: invitee cannot modify structural columns
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$UPDATE public.friend_asks SET creator_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = '20000000-0000-0000-0000-000000000001'$$,
  NULL,
  'Bob (invitee) cannot change creator_id — trigger blocks it'
);

SELECT * FROM finish();
ROLLBACK;
