-- pgTAP tests for applications RLS policies

BEGIN;
SELECT plan(8);
SELECT tests.create_test_users();

-- Seed: Alice creates a posting, Bob applies
INSERT INTO public.postings (id, creator_id, title, description, status, is_test_data, expires_at)
VALUES ('10000000-0000-0000-0000-000000000001', tests.alice(), 'Alice Post', 'test', 'open', true, now() + interval '30 days');

INSERT INTO public.applications (id, posting_id, applicant_id, cover_message, status)
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', tests.bob(), 'Hi!', 'pending');

-- ============================================
-- SELECT: applicant can see their own application
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.applications WHERE id = '30000000-0000-0000-0000-000000000001'),
  1,
  'Bob can see his own application'
);

-- ============================================
-- SELECT: posting owner can see applications on their posting
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.applications WHERE posting_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Alice (posting owner) can see applications on her posting'
);

-- ============================================
-- SELECT: unrelated user cannot see the application
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.applications),
  0,
  'Carol (unrelated) cannot see any applications'
);

-- ============================================
-- INSERT: user can only apply as themselves
-- ============================================

SELECT lives_ok(
  $$INSERT INTO public.applications (posting_id, applicant_id, cover_message)
    VALUES ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Hello')$$,
  'Carol can apply as herself'
);

SELECT throws_ok(
  $$INSERT INTO public.applications (posting_id, applicant_id, cover_message)
    VALUES ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Imposter')$$,
  NULL,
  'Carol cannot apply as Alice'
);

-- ============================================
-- UPDATE: posting owner can update (accept/reject)
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.applications SET status = 'accepted' WHERE id = '30000000-0000-0000-0000-000000000001'$$,
  'Alice (posting owner) can accept Bob''s application'
);

-- ============================================
-- UPDATE: applicant can update (withdraw)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.applications SET status = 'withdrawn' WHERE id = '30000000-0000-0000-0000-000000000001'$$,
  'Bob can withdraw his own application'
);

-- ============================================
-- UPDATE: unrelated user cannot update
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
UPDATE public.applications SET status = 'rejected' WHERE id = '30000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT isnt(
  (SELECT status FROM public.applications WHERE id = '30000000-0000-0000-0000-000000000001'),
  'rejected',
  'Carol cannot update Bob''s application on Alice''s posting'
);

SELECT * FROM finish();
ROLLBACK;
