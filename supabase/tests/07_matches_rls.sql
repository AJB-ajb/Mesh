-- pgTAP tests for matches RLS policies

BEGIN;
SELECT plan(5);
SELECT tests.create_test_users();

-- Seed
INSERT INTO public.postings (id, creator_id, title, description, status, is_test_data, expires_at)
VALUES ('10000000-0000-0000-0000-000000000001', tests.alice(), 'Alice Post', 'test', 'open', true, now() + interval '30 days');

INSERT INTO public.matches (id, posting_id, user_id, similarity_score, status)
VALUES ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', tests.bob(), 0.85, 'pending');

-- ============================================
-- SELECT: matched user can see their match
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.matches WHERE id = '80000000-0000-0000-0000-000000000001'),
  1,
  'Bob can see his own match'
);

-- ============================================
-- SELECT: posting owner can see matches on their posting
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.matches WHERE posting_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Alice (posting owner) can see matches on her posting'
);

-- ============================================
-- SELECT: unrelated user cannot see matches
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.matches),
  0,
  'Carol cannot see any matches'
);

-- ============================================
-- UPDATE: posting owner can update match
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.matches SET status = 'accepted' WHERE id = '80000000-0000-0000-0000-000000000001'$$,
  'Alice (posting owner) can update match status'
);

-- ============================================
-- UPDATE: unrelated user cannot update
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
UPDATE public.matches SET status = 'declined' WHERE id = '80000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT status FROM public.matches WHERE id = '80000000-0000-0000-0000-000000000001'),
  'accepted',
  'Carol cannot update matches she is not involved in'
);

SELECT * FROM finish();
ROLLBACK;
