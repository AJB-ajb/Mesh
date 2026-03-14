-- pgTAP tests for space_invites RLS policies
-- Policies under test:
--   SELECT: created_by = auth.uid() OR auth.uid() = any(ordered_list)
--   INSERT: posting creator (exists check on space_postings.created_by)
--   UPDATE: created_by = auth.uid() OR auth.uid() = any(ordered_list)
--   DELETE: created_by = auth.uid()

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(10);
SELECT tests.create_test_users();

-- ============================================
-- Seed data (as superuser)
-- ============================================

-- Space with Alice as admin
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES ('51000000-0000-0000-0000-000000000020'::uuid, 'Invite Test Space', tests.alice(), false, '{"visibility":"private"}'::jsonb);

INSERT INTO public.space_members (space_id, user_id, role)
VALUES
  ('51000000-0000-0000-0000-000000000020', tests.alice(), 'admin'),
  ('51000000-0000-0000-0000-000000000020', tests.bob(), 'member');

-- Posting by Alice
INSERT INTO public.space_postings (id, space_id, created_by, text, visibility, status)
VALUES ('5b100000-0000-0000-0000-000000000030'::uuid, '51000000-0000-0000-0000-000000000020', tests.alice(), 'Invite posting', 'public', 'open');

-- Invite created by Alice, with Bob in ordered_list (Carol is NOT in the list)
INSERT INTO public.space_invites (id, posting_id, created_by, mode, ordered_list, status)
VALUES (
  '5c000000-0000-0000-0000-000000000001'::uuid,
  '5b100000-0000-0000-0000-000000000030',
  tests.alice(),
  'sequential',
  ARRAY[tests.bob()],
  'active'
);

-- ============================================
-- 1. Creator (posting owner) can see their invite
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_invites WHERE id = '5c000000-0000-0000-0000-000000000001'),
  1,
  'Alice (creator) can see her invite'
);

-- ============================================
-- 2. User in ordered_list can see the invite
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_invites WHERE id = '5c000000-0000-0000-0000-000000000001'),
  1,
  'Bob (in ordered_list) can see the invite'
);

-- ============================================
-- 3. Outsider cannot see invite
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_invites),
  0,
  'Carol (outsider) cannot see any invites'
);

-- ============================================
-- 4. Posting creator can insert invite
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.space_invites (id, posting_id, created_by, mode, ordered_list)
    VALUES ('5c000000-0000-0000-0000-000000000002', '5b100000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000001', 'parallel', ARRAY['c0000000-0000-0000-0000-000000000003'::uuid])$$,
  'Alice (posting creator) can insert invite'
);

-- ============================================
-- 5. Non-posting-creator cannot insert invite
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.space_invites (id, posting_id, created_by, mode, ordered_list)
    VALUES ('5c000000-0000-0000-0000-000000000003', '5b100000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000002', 'sequential', ARRAY['c0000000-0000-0000-0000-000000000003'::uuid])$$,
  NULL,
  'Bob (not posting creator) cannot insert invite'
);

-- ============================================
-- 6. Invitee (in ordered_list) can update invite
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_invites SET pending = ARRAY['b0000000-0000-0000-0000-000000000002'::uuid] WHERE id = '5c000000-0000-0000-0000-000000000001'$$,
  'Bob (invitee in ordered_list) can update invite'
);

SELECT is(
  (SELECT pending[1]::text FROM public.space_invites WHERE id = '5c000000-0000-0000-0000-000000000001'),
  'b0000000-0000-0000-0000-000000000002',
  'Bob pending update actually took effect'
);

-- ============================================
-- 7. Creator can update invite
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_invites SET status = 'completed' WHERE id = '5c000000-0000-0000-0000-000000000001'$$,
  'Alice (creator) can update invite'
);

SELECT is(
  (SELECT status FROM public.space_invites WHERE id = '5c000000-0000-0000-0000-000000000001'),
  'completed',
  'Alice status update actually took effect'
);

-- ============================================
-- 8. Invitee cannot delete invite (only creator can)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

DELETE FROM public.space_invites WHERE id = '5c000000-0000-0000-0000-000000000001';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_invites WHERE id = '5c000000-0000-0000-0000-000000000001'),
  1,
  'Bob (invitee) cannot delete invite — only creator can'
);

SELECT * FROM finish();
ROLLBACK;
