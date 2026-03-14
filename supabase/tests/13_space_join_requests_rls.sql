-- pgTAP tests for space_join_requests RLS policies
-- Policies under test:
--   SELECT: user_id = auth.uid() OR posting creator = auth.uid()
--   INSERT: user_id = auth.uid()
--   UPDATE: user_id = auth.uid() OR posting creator = auth.uid()

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(8);
SELECT tests.create_test_users();

-- ============================================
-- Seed data (as superuser)
-- ============================================

-- Space with Alice as admin, Bob as member
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES ('51000000-0000-0000-0000-000000000010'::uuid, 'JR Test Space', tests.alice(), false, '{"visibility":"private"}'::jsonb);

INSERT INTO public.space_members (space_id, user_id, role)
VALUES
  ('51000000-0000-0000-0000-000000000010', tests.alice(), 'admin'),
  ('51000000-0000-0000-0000-000000000010', tests.bob(), 'member');

-- Posting by Alice
INSERT INTO public.space_postings (id, space_id, created_by, text, visibility, status)
VALUES ('5b100000-0000-0000-0000-000000000020'::uuid, '51000000-0000-0000-0000-000000000010', tests.alice(), 'Join me', 'public', 'open');

-- Join request from Bob on Alice's posting
INSERT INTO public.space_join_requests (id, posting_id, user_id, status)
VALUES ('70000000-0000-0000-0000-000000000001'::uuid, '5b100000-0000-0000-0000-000000000020', tests.bob(), 'pending');

-- ============================================
-- 1. Requester sees own join request
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_join_requests WHERE id = '70000000-0000-0000-0000-000000000001'),
  1,
  'Bob (requester) can see his own join request'
);

-- ============================================
-- 2. Posting creator sees all join requests for their posting
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_join_requests WHERE posting_id = '5b100000-0000-0000-0000-000000000020'),
  1,
  'Alice (posting creator) can see join requests on her posting'
);

-- ============================================
-- 3. Unrelated user (Carol) sees no join requests
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_join_requests),
  0,
  'Carol (unrelated) cannot see any join requests'
);

-- ============================================
-- 4. User can create join request as themselves
-- ============================================

RESET ROLE;

-- Add Carol as member so she can see the posting (needed for context, but INSERT policy only checks user_id)
INSERT INTO public.space_members (space_id, user_id, role)
VALUES ('51000000-0000-0000-0000-000000000010', tests.carol(), 'member');

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.space_join_requests (id, posting_id, user_id, status)
    VALUES ('70000000-0000-0000-0000-000000000002', '5b100000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000003', 'pending')$$,
  'Carol can create a join request as herself'
);

-- ============================================
-- 5. Cannot create join request as someone else
-- ============================================

SELECT throws_ok(
  $$INSERT INTO public.space_join_requests (id, posting_id, user_id, status)
    VALUES ('70000000-0000-0000-0000-000000000003', '5b100000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'pending')$$,
  NULL,
  'Carol cannot create join request as Alice (spoofing blocked)'
);

-- ============================================
-- 6. Requester can update own request (e.g., withdraw)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_join_requests SET status = 'withdrawn' WHERE id = '70000000-0000-0000-0000-000000000001'$$,
  'Bob can update (withdraw) his own join request'
);

-- ============================================
-- 7. Posting creator can update request (e.g., accept)
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_join_requests SET status = 'accepted' WHERE id = '70000000-0000-0000-0000-000000000001'$$,
  'Alice (posting creator) can update join request (accept)'
);

-- ============================================
-- 8. Unrelated user cannot update request
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

UPDATE public.space_join_requests SET status = 'rejected' WHERE id = '70000000-0000-0000-0000-000000000001';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT status FROM public.space_join_requests WHERE id = '70000000-0000-0000-0000-000000000001'),
  'accepted',
  'Carol cannot update Bob''s join request (still accepted)'
);

SELECT * FROM finish();
ROLLBACK;
