-- pgTAP tests for space_members RLS policies
-- Policies under test:
--   SELECT: space_members_select (is_space_member)
--   INSERT: space_members_insert (self-join or admin)
--   UPDATE: space_members_update (self or admin)
--   DELETE: space_members_delete (self or admin)
-- Also tests prevent_last_admin_removal trigger (DELETE + UPDATE)

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(11);
SELECT tests.create_test_users();

-- ============================================
-- Seed test data (as superuser)
-- ============================================

-- Private space: Alice=admin, Bob=member
INSERT INTO public.spaces (id, name, created_by, settings)
VALUES (
  '50000000-0000-0000-0000-000000000010'::uuid,
  'Members Test Space', tests.alice(),
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES
  ('50000000-0000-0000-0000-000000000010', tests.alice(), 'admin', now()),
  ('50000000-0000-0000-0000-000000000010', tests.bob(), 'member', now());

-- Second space for self-join test: Alice=admin, no other members
INSERT INTO public.spaces (id, name, created_by, settings)
VALUES (
  '50000000-0000-0000-0000-000000000011'::uuid,
  'Join Test Space', tests.alice(),
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES ('50000000-0000-0000-0000-000000000011', tests.alice(), 'admin', now());

-- ============================================
-- 1. Member can see other members of their space
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_members WHERE space_id = '50000000-0000-0000-0000-000000000010'),
  2,
  'Member (Bob) can see all members of their space'
);

-- ============================================
-- 2. Non-member cannot see members of a private space
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_members WHERE space_id = '50000000-0000-0000-0000-000000000010'),
  0,
  'Non-member (Carol) cannot see members of private space'
);

-- ============================================
-- 3. User can self-join (insert themselves)
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.space_members (space_id, user_id, role, visible_from)
    VALUES ('50000000-0000-0000-0000-000000000010',
            'c0000000-0000-0000-0000-000000000003', 'member', now())$$,
  'User (Carol) can self-join a space'
);

-- ============================================
-- 4. Admin can add another user
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.space_members (space_id, user_id, role, visible_from)
    VALUES ('50000000-0000-0000-0000-000000000011',
            'b0000000-0000-0000-0000-000000000002', 'member', now())$$,
  'Admin (Alice) can add another user (Bob) to space'
);

-- ============================================
-- 5. Non-admin cannot add another user (who isn't themselves)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.space_members (space_id, user_id, role, visible_from)
    VALUES ('50000000-0000-0000-0000-000000000011',
            'c0000000-0000-0000-0000-000000000003', 'member', now())$$,
  NULL,
  'Non-admin (Bob) cannot add another user'
);

-- ============================================
-- 6. User can update own membership (e.g., muted=true)
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_members SET muted = true
    WHERE space_id = '50000000-0000-0000-0000-000000000010'
      AND user_id = 'b0000000-0000-0000-0000-000000000002'$$,
  'User (Bob) can update own membership (muted)'
);

-- ============================================
-- 7. Admin can update another member's role
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_members SET role = 'admin'
    WHERE space_id = '50000000-0000-0000-0000-000000000010'
      AND user_id = 'b0000000-0000-0000-0000-000000000002'$$,
  'Admin (Alice) can update another member''s role'
);

-- ============================================
-- 8. User can leave (delete self)
-- ============================================

-- Reset Bob back to member for this test (as superuser)
RESET ROLE;
UPDATE public.space_members SET role = 'member'
  WHERE space_id = '50000000-0000-0000-0000-000000000010'
    AND user_id = tests.bob();

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$DELETE FROM public.space_members
    WHERE space_id = '50000000-0000-0000-0000-000000000010'
      AND user_id = 'b0000000-0000-0000-0000-000000000002'$$,
  'User (Bob) can leave space (delete self)'
);

-- ============================================
-- 9. Admin can remove another member
-- ============================================

-- Re-add Carol and Bob for this test (as superuser)
RESET ROLE;
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES ('50000000-0000-0000-0000-000000000010', tests.bob(), 'member', now())
ON CONFLICT (space_id, user_id) DO NOTHING;

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$DELETE FROM public.space_members
    WHERE space_id = '50000000-0000-0000-0000-000000000010'
      AND user_id = 'c0000000-0000-0000-0000-000000000003'$$,
  'Admin (Alice) can remove another member (Carol)'
);

-- ============================================
-- 10. Trigger: deleting the last admin raises error
-- ============================================

RESET ROLE;

SELECT throws_ok(
  $$DELETE FROM public.space_members
    WHERE space_id = '50000000-0000-0000-0000-000000000010'
      AND user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514',
  'Cannot remove or demote the last admin of a space',
  'Deleting the last admin raises error'
);

-- ============================================
-- 11. Trigger: demoting last admin raises error
-- ============================================

SELECT throws_ok(
  $$UPDATE public.space_members SET role = 'member'
    WHERE space_id = '50000000-0000-0000-0000-000000000010'
      AND user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514',
  'Cannot remove or demote the last admin of a space',
  'Demoting the last admin raises error'
);

SELECT * FROM finish();
ROLLBACK;
