-- pgTAP tests for space_postings RLS policies
-- Policies under test:
--   SELECT: member of space, global space, or public posting
--   INSERT: created_by = auth.uid() AND is_space_member(space_id, auth.uid())
--   UPDATE: created_by = auth.uid()
--   DELETE: created_by = auth.uid()

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(10);
SELECT tests.create_test_users();

-- ============================================
-- Seed data (as superuser)
-- ============================================

-- Private space owned by Alice; Alice and Bob are members
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES ('51000000-0000-0000-0000-000000000001'::uuid, 'Private Space', tests.alice(), false, '{"visibility":"private"}'::jsonb);

INSERT INTO public.space_members (space_id, user_id, role)
VALUES
  ('51000000-0000-0000-0000-000000000001', tests.alice(), 'admin'),
  ('51000000-0000-0000-0000-000000000001', tests.bob(), 'member');

-- Remove any existing global space (unique partial index enforces at most one)
ALTER TABLE public.space_members DISABLE TRIGGER trg_prevent_last_admin_removal;
DELETE FROM public.spaces WHERE is_global = true;
ALTER TABLE public.space_members ENABLE TRIGGER trg_prevent_last_admin_removal;

-- Global space
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES ('51000000-0000-0000-0000-000000000002'::uuid, 'Global Space', tests.alice(), true, '{}'::jsonb);

INSERT INTO public.space_members (space_id, user_id, role)
VALUES ('51000000-0000-0000-0000-000000000002', tests.alice(), 'admin');

-- Private posting in the private space (by Alice)
INSERT INTO public.space_postings (id, space_id, created_by, text, visibility, status)
VALUES ('5b100000-0000-0000-0000-000000000001'::uuid, '51000000-0000-0000-0000-000000000001', tests.alice(), 'Private posting', 'private', 'open');

-- Public posting in the private space (by Alice)
INSERT INTO public.space_postings (id, space_id, created_by, text, visibility, status)
VALUES ('5b100000-0000-0000-0000-000000000002'::uuid, '51000000-0000-0000-0000-000000000001', tests.alice(), 'Public posting', 'public', 'open');

-- Posting in global space (by Alice)
INSERT INTO public.space_postings (id, space_id, created_by, text, visibility, status)
VALUES ('5b100000-0000-0000-0000-000000000003'::uuid, '51000000-0000-0000-0000-000000000002', tests.alice(), 'Global posting', 'private', 'open');

-- ============================================
-- 1. Member sees posting in their private space
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000001'),
  1,
  'Member (Bob) can see private posting in their space'
);

-- ============================================
-- 2. Posting in global space visible to any authenticated user
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000003'),
  1,
  'Carol can see posting in global space (even though not a member)'
);

-- ============================================
-- 3. Public visibility posting visible to any authenticated user
-- ============================================

SELECT is(
  (SELECT count(*)::int FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000002'),
  1,
  'Carol can see public-visibility posting even in private space'
);

-- ============================================
-- 4. Private posting in private space NOT visible to non-member
-- ============================================

SELECT is(
  (SELECT count(*)::int FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000001'),
  0,
  'Carol (non-member) cannot see private posting in private space'
);

-- ============================================
-- 5. Anonymous cannot see any space postings
-- ============================================

SELECT tests.clear_authentication();
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000001'),
  0,
  'Anonymous user cannot see private space postings'
);

-- ============================================
-- 6. Member can create posting in their space
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.space_postings (id, space_id, created_by, text, visibility)
    VALUES ('5b100000-0000-0000-0000-000000000010', '51000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Bob posting', 'public')$$,
  'Bob (member) can create posting in his space'
);

-- ============================================
-- 7. creator_id spoofing blocked
-- ============================================

SELECT throws_ok(
  $$INSERT INTO public.space_postings (id, space_id, created_by, text, visibility)
    VALUES ('5b100000-0000-0000-0000-000000000011', '51000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Spoofed', 'public')$$,
  NULL,
  'Bob cannot create posting with created_by = Alice (spoofing blocked)'
);

-- ============================================
-- 8. Non-member cannot insert posting in space they don't belong to
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.space_postings (id, space_id, created_by, text, visibility)
    VALUES ('5b100000-0000-0000-0000-000000000012', '51000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Intruder', 'public')$$,
  NULL,
  'Carol (non-member) cannot insert posting in private space'
);

-- ============================================
-- 9. Creator can update own posting
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$UPDATE public.space_postings SET text = 'Updated text' WHERE id = '5b100000-0000-0000-0000-000000000001'$$,
  'Alice can update her own posting'
);

-- ============================================
-- 10. Non-creator cannot update/delete posting
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

-- Bob tries to update Alice's posting (silent no-op due to RLS)
UPDATE public.space_postings SET text = 'Hacked' WHERE id = '5b100000-0000-0000-0000-000000000001';

-- Bob tries to delete Alice's posting (silent no-op due to RLS)
DELETE FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000001';

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT text FROM public.space_postings WHERE id = '5b100000-0000-0000-0000-000000000001'),
  'Updated text',
  'Bob cannot update or delete Alice''s posting'
);

SELECT * FROM finish();
ROLLBACK;
