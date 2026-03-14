-- pgTAP tests for activity_cards RLS policies
-- Policies under test:
--   SELECT: user_id = auth.uid()
--   INSERT: auth.uid() is not null
--   UPDATE: user_id = auth.uid()
--   DELETE: user_id = auth.uid()

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(6);
SELECT tests.create_test_users();

-- ============================================
-- Seed data (as superuser)
-- ============================================

INSERT INTO public.activity_cards (id, user_id, type, title, data, status)
VALUES
  ('ac000000-0000-0000-0000-000000000001'::uuid, tests.alice(), 'match', 'New match', '{}', 'pending'),
  ('ac000000-0000-0000-0000-000000000002'::uuid, tests.alice(), 'invite', 'You are invited', '{}', 'pending'),
  ('ac000000-0000-0000-0000-000000000003'::uuid, tests.bob(), 'join_request', 'Someone wants to join', '{}', 'pending');

-- ============================================
-- 1. Owner sees own activity cards
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.activity_cards WHERE user_id = tests.alice()),
  2,
  'Alice sees her own 2 activity cards'
);

-- ============================================
-- 2. Non-owner cannot see another''s activity cards
-- ============================================

SELECT is(
  (SELECT count(*)::int FROM public.activity_cards WHERE user_id = tests.bob()),
  0,
  'Alice cannot see Bob''s activity cards'
);

-- ============================================
-- 3. Any authenticated user can insert activity card
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.activity_cards (id, user_id, type, title, data)
    VALUES ('ac000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003', 'rsvp', 'RSVP card', '{}')$$,
  'Carol (any authenticated user) can insert an activity card'
);

-- ============================================
-- 4. Owner can update own card
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.activity_cards SET status = 'acted' WHERE id = 'ac000000-0000-0000-0000-000000000001'$$,
  'Alice can update her own activity card'
);

-- ============================================
-- 5. Non-owner cannot update another''s card
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

UPDATE public.activity_cards SET status = 'dismissed' WHERE id = 'ac000000-0000-0000-0000-000000000001';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT status FROM public.activity_cards WHERE id = 'ac000000-0000-0000-0000-000000000001'),
  'acted',
  'Bob cannot update Alice''s activity card (still acted)'
);

-- ============================================
-- 6. Owner can delete own card; non-owner cannot
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

-- Bob tries to delete Alice's card (silent no-op)
DELETE FROM public.activity_cards WHERE id = 'ac000000-0000-0000-0000-000000000002';

-- Bob deletes his own card (should work)
DELETE FROM public.activity_cards WHERE id = 'ac000000-0000-0000-0000-000000000003';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.activity_cards WHERE id = 'ac000000-0000-0000-0000-000000000002'),
  1,
  'Bob cannot delete Alice''s card, but can delete his own'
);

SELECT * FROM finish();
ROLLBACK;
