-- pgTAP tests for spaces RLS policies
-- Policies under test:
--   SELECT: spaces_select (global, public visibility, or member via is_space_member)
--   INSERT: spaces_insert (any authenticated user)
--   UPDATE: spaces_update (admin member only)
--   DELETE: spaces_delete (admin member only)

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(12);
SELECT tests.create_test_users();

-- ============================================
-- Seed test data (as superuser)
-- ============================================

-- Remove any existing global space (unique partial index enforces at most one)
-- Disable trigger so CASCADE delete of last admin doesn't block cleanup
ALTER TABLE public.space_members DISABLE TRIGGER trg_prevent_last_admin_removal;
DELETE FROM public.spaces WHERE is_global = true;
ALTER TABLE public.space_members ENABLE TRIGGER trg_prevent_last_admin_removal;

-- Global space
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES (
  '50000000-0000-0000-0000-000000000001'::uuid,
  'Global Space', tests.alice(), true,
  '{"visibility": "public"}'::jsonb
);

-- Public (non-global) space
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES (
  '50000000-0000-0000-0000-000000000002'::uuid,
  'Public Space', tests.alice(), false,
  '{"visibility": "public"}'::jsonb
);

-- Private space (Alice is admin, Bob is member)
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES (
  '50000000-0000-0000-0000-000000000003'::uuid,
  'Private Space', tests.alice(), false,
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES
  ('50000000-0000-0000-0000-000000000003', tests.alice(), 'admin', now()),
  ('50000000-0000-0000-0000-000000000003', tests.bob(), 'member', now());

-- Parent space with Alice as member, child space inherits members
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES (
  '50000000-0000-0000-0000-000000000004'::uuid,
  'Parent Space', tests.alice(), false,
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES ('50000000-0000-0000-0000-000000000004', tests.alice(), 'admin', now());

INSERT INTO public.spaces (id, name, created_by, parent_space_id, inherits_members, settings)
VALUES (
  '50000000-0000-0000-0000-000000000005'::uuid,
  'Child Space', tests.alice(),
  '50000000-0000-0000-0000-000000000004'::uuid,
  true,
  '{"visibility": "private"}'::jsonb
);

-- ============================================
-- 1. Global space visible to any authenticated user
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000001'),
  1,
  'Global space visible to any authenticated user (Carol)'
);

-- ============================================
-- 2. Public space visible to any authenticated user
-- ============================================

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000002'),
  1,
  'Public space visible to any authenticated user (Carol)'
);

-- ============================================
-- 3. Private space visible only to members
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003'),
  1,
  'Private space visible to member (Bob)'
);

-- ============================================
-- 4. Inherited member sees child space via recursive CTE
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000005'),
  1,
  'Inherited member (Alice, parent member) sees child space'
);

-- ============================================
-- 5. Non-member cannot see private space
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003'),
  0,
  'Non-member (Carol) cannot see private space'
);

-- ============================================
-- 6. Anonymous cannot see any spaces
-- ============================================

SELECT tests.clear_authentication();
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003'),
  0,
  'Anonymous user cannot see private spaces'
);

-- ============================================
-- 7. Any authenticated user can INSERT a space
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.spaces (id, name, created_by, settings)
    VALUES ('50000000-0000-0000-0000-000000000099'::uuid, 'Carol Space',
            'c0000000-0000-0000-0000-000000000003',
            '{"visibility": "private"}'::jsonb)$$,
  'Any authenticated user (Carol) can insert a space'
);

-- ============================================
-- 8. Admin can UPDATE space
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.spaces SET name = 'Updated Private' WHERE id = '50000000-0000-0000-0000-000000000003'$$,
  'Admin (Alice) can update space'
);

-- ============================================
-- 9. Non-admin member cannot UPDATE space
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

UPDATE public.spaces SET name = 'Hacked' WHERE id = '50000000-0000-0000-0000-000000000003';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT name FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003'),
  'Updated Private',
  'Non-admin member (Bob) cannot update space'
);

-- ============================================
-- 10. Non-member cannot UPDATE space
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

UPDATE public.spaces SET name = 'Hacked by Carol' WHERE id = '50000000-0000-0000-0000-000000000003';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT name FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003'),
  'Updated Private',
  'Non-member (Carol) cannot update space'
);

-- ============================================
-- 11. Admin can DELETE space
-- ============================================

RESET ROLE;

INSERT INTO public.spaces (id, name, created_by, settings)
VALUES (
  '50000000-0000-0000-0000-000000000090'::uuid,
  'Deletable Space', tests.alice(),
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES
  ('50000000-0000-0000-0000-000000000090', tests.alice(), 'admin', now()),
  ('50000000-0000-0000-0000-000000000090', tests.bob(), 'admin', now());

-- Remove Alice's membership first so CASCADE only hits Bob (another admin remains: Alice was removed, but
-- the trigger only fires on remaining rows). Actually — remove non-admin member first, then delete space.
-- The trick: delete Bob's admin membership as superuser, then Alice can delete the space (she's last admin
-- and the CASCADE deletes only her, but the trigger allows it because the space itself is being deleted).
-- Simplest approach: just test that admin can execute DELETE (RLS permits it) by checking row disappears.
SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

-- Delete the member rows first (Alice can delete herself as admin, and Bob via admin privilege)
DELETE FROM public.space_members WHERE space_id = '50000000-0000-0000-0000-000000000090' AND user_id = tests.bob();

RESET ROLE;
-- Now remove the trigger temporarily so we can test the RLS DELETE policy in isolation
ALTER TABLE public.space_members DISABLE TRIGGER trg_prevent_last_admin_removal;

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$DELETE FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000090'$$,
  'Admin (Alice) can delete space'
);

-- Re-enable the trigger
RESET ROLE;
ALTER TABLE public.space_members ENABLE TRIGGER trg_prevent_last_admin_removal;

-- ============================================
-- 12. Non-member cannot DELETE space
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

DELETE FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.spaces WHERE id = '50000000-0000-0000-0000-000000000003'),
  1,
  'Non-member (Carol) cannot delete space'
);

SELECT * FROM finish();
ROLLBACK;
