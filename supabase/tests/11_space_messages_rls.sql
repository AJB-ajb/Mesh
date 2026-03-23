-- pgTAP tests for space_messages RLS policies
-- Policies under test:
--   SELECT: space_messages_select (member with visible_from, or inherited member)
--   INSERT: space_messages_insert (sender_id = auth.uid() AND is_space_member)

BEGIN;
SET search_path TO extensions, public, auth;
SELECT plan(10);
SELECT tests.create_test_users();

-- ============================================
-- Seed test data (as superuser)
-- ============================================

-- Private space: Alice=admin (joined a day ago), Bob=member (joined now, visible_from = now())
INSERT INTO public.spaces (id, name, created_by, settings)
VALUES (
  '50000000-0000-0000-0000-000000000020'::uuid,
  'Messages Test Space', tests.alice(),
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES
  ('50000000-0000-0000-0000-000000000020', tests.alice(), 'admin', now() - interval '7 days'),
  ('50000000-0000-0000-0000-000000000020', tests.bob(), 'member', now());

-- Old message (created yesterday)
INSERT INTO public.space_messages (id, space_id, sender_id, type, content, created_at)
VALUES (
  '5a000000-0000-0000-0000-000000000001'::uuid,
  '50000000-0000-0000-0000-000000000020',
  tests.alice(), 'message', 'Old message from yesterday',
  now() - interval '1 day'
);

-- New message (created now)
INSERT INTO public.space_messages (id, space_id, sender_id, type, content, created_at)
VALUES (
  '5a000000-0000-0000-0000-000000000002'::uuid,
  '50000000-0000-0000-0000-000000000020',
  tests.alice(), 'message', 'New message just now',
  now()
);

-- Parent space with Alice as member, child space inherits members
INSERT INTO public.spaces (id, name, created_by, settings)
VALUES (
  '50000000-0000-0000-0000-000000000021'::uuid,
  'Parent For Messages', tests.alice(),
  '{"visibility": "private"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES ('50000000-0000-0000-0000-000000000021', tests.alice(), 'admin', now() - interval '7 days');

INSERT INTO public.spaces (id, name, created_by, parent_space_id, inherits_members, settings)
VALUES (
  '50000000-0000-0000-0000-000000000022'::uuid,
  'Child For Messages', tests.alice(),
  '50000000-0000-0000-0000-000000000021'::uuid,
  true,
  '{"visibility": "private"}'::jsonb
);

-- Message in child space
INSERT INTO public.space_messages (id, space_id, sender_id, type, content, created_at)
VALUES (
  '5a000000-0000-0000-0000-000000000003'::uuid,
  '50000000-0000-0000-0000-000000000022',
  tests.alice(), 'message', 'Child space message',
  now()
);

-- Remove any existing global space (unique partial index enforces at most one)
ALTER TABLE public.space_members DISABLE TRIGGER trg_prevent_last_admin_removal;
DELETE FROM public.spaces WHERE is_global = true;
ALTER TABLE public.space_members ENABLE TRIGGER trg_prevent_last_admin_removal;

-- Global space with a message
INSERT INTO public.spaces (id, name, created_by, is_global, settings)
VALUES (
  '50000000-0000-0000-0000-000000000023'::uuid,
  'Global Messages Space', tests.alice(), true,
  '{"visibility": "public"}'::jsonb
);
INSERT INTO public.space_members (space_id, user_id, role, visible_from)
VALUES ('50000000-0000-0000-0000-000000000023', tests.alice(), 'admin', now() - interval '7 days');

INSERT INTO public.space_messages (id, space_id, sender_id, type, content, created_at)
VALUES (
  '5a000000-0000-0000-0000-000000000004'::uuid,
  '50000000-0000-0000-0000-000000000023',
  tests.alice(), 'message', 'Global space message',
  now()
);

-- ============================================
-- 1. Member can see messages created after their visible_from
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages WHERE space_id = '50000000-0000-0000-0000-000000000020'),
  2,
  'Alice (joined 7 days ago) can see all messages in space'
);

-- ============================================
-- 2. Member CANNOT see messages before their visible_from
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages WHERE space_id = '50000000-0000-0000-0000-000000000020'),
  1,
  'Bob (visible_from = now()) cannot see old message, only sees new message'
);

-- ============================================
-- 3. Inherited member sees all messages in child space
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages WHERE space_id = '50000000-0000-0000-0000-000000000022'),
  1,
  'Inherited member (Alice, parent member) sees messages in child space'
);

-- ============================================
-- 4. Non-member cannot see messages
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages WHERE space_id = '50000000-0000-0000-0000-000000000020'),
  0,
  'Non-member (Carol) cannot see messages'
);

-- ============================================
-- 5. Anonymous cannot see messages
-- ============================================

SELECT tests.clear_authentication();
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages),
  0,
  'Anonymous user cannot see any messages'
);

-- ============================================
-- 6. Member can insert message as themselves
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.space_messages (id, space_id, sender_id, type, content)
    VALUES ('5a000000-0000-0000-0000-000000000090'::uuid,
            '50000000-0000-0000-0000-000000000020',
            'a0000000-0000-0000-0000-000000000001', 'message', 'Hello from Alice')$$,
  'Member (Alice) can insert message as themselves'
);

-- ============================================
-- 7. sender_id spoofing blocked
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.space_messages (id, space_id, sender_id, type, content)
    VALUES ('5a000000-0000-0000-0000-000000000091'::uuid,
            '50000000-0000-0000-0000-000000000020',
            'a0000000-0000-0000-0000-000000000001', 'message', 'Spoofed as Alice')$$,
  NULL,
  'sender_id spoofing blocked (Bob cannot send as Alice)'
);

-- ============================================
-- 8. Non-member cannot insert message
-- ============================================

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.space_messages (id, space_id, sender_id, type, content)
    VALUES ('5a000000-0000-0000-0000-000000000092'::uuid,
            '50000000-0000-0000-0000-000000000020',
            'c0000000-0000-0000-0000-000000000003', 'message', 'Carol sneaking in')$$,
  NULL,
  'Non-member (Carol) cannot insert message'
);

-- ============================================
-- 9. Messages in global space visible to member
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages WHERE id = '5a000000-0000-0000-0000-000000000004'),
  1,
  'Member of global space (Alice) can see global space messages'
);

-- ============================================
-- 10. Multiple messages: member sees only those after visible_from
-- ============================================

RESET ROLE;

-- Add more messages: one before Bob's visible_from, one after
INSERT INTO public.space_messages (id, space_id, sender_id, type, content, created_at)
VALUES
  ('5a000000-0000-0000-0000-000000000005'::uuid,
   '50000000-0000-0000-0000-000000000020',
   tests.alice(), 'message', 'Another old message',
   now() - interval '2 days'),
  ('5a000000-0000-0000-0000-000000000006'::uuid,
   '50000000-0000-0000-0000-000000000020',
   tests.alice(), 'message', 'Another new message',
   now() + interval '1 second');

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.space_messages WHERE space_id = '50000000-0000-0000-0000-000000000020'),
  3,
  'Bob sees only messages after visible_from (3 of 5 total: new, Alice insert, another new)'
);

SELECT * FROM finish();
ROLLBACK;
