-- pgTAP tests for notifications RLS policies

BEGIN;
SELECT plan(6);
SELECT tests.create_test_users();

-- Seed: notification for Alice
INSERT INTO public.notifications (id, user_id, type, title)
VALUES ('60000000-0000-0000-0000-000000000001', tests.alice(), 'match', 'New match!');

-- ============================================
-- SELECT: only own notifications
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.notifications WHERE id = '60000000-0000-0000-0000-000000000001'),
  1,
  'Alice can see her own notification'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.notifications),
  0,
  'Bob cannot see Alice''s notifications'
);

-- ============================================
-- INSERT: any authenticated user can create notifications
-- ============================================

SELECT lives_ok(
  $$INSERT INTO public.notifications (user_id, type, title) VALUES ('a0000000-0000-0000-0000-000000000001', 'message', 'Hi')$$,
  'Bob can create a notification (for system-generated notifications)'
);

-- ============================================
-- UPDATE: only own
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.notifications SET read = true WHERE id = '60000000-0000-0000-0000-000000000001'$$,
  'Alice can mark her notification as read'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
UPDATE public.notifications SET read = false WHERE id = '60000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT read FROM public.notifications WHERE id = '60000000-0000-0000-0000-000000000001'),
  true,
  'Bob cannot update Alice''s notification'
);

-- ============================================
-- DELETE: only own
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
DELETE FROM public.notifications WHERE id = '60000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.notifications WHERE id = '60000000-0000-0000-0000-000000000001'),
  1,
  'Bob cannot delete Alice''s notification'
);

SELECT * FROM finish();
ROLLBACK;
