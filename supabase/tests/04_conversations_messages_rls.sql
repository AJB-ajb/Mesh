-- pgTAP tests for conversations and messages RLS policies

BEGIN;
SELECT plan(9);
SELECT tests.create_test_users();

-- Seed: conversation between Alice and Bob
INSERT INTO public.conversations (id, participant_1, participant_2)
VALUES ('40000000-0000-0000-0000-000000000001', tests.alice(), tests.bob());

INSERT INTO public.messages (id, conversation_id, sender_id, content)
VALUES ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', tests.alice(), 'Hello Bob');

-- ============================================
-- Conversations SELECT
-- ============================================

SELECT tests.authenticate_as(tests.alice());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.conversations WHERE id = '40000000-0000-0000-0000-000000000001'),
  1,
  'Alice (participant) can see her conversation'
);

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.conversations WHERE id = '40000000-0000-0000-0000-000000000001'),
  1,
  'Bob (participant) can see the conversation'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.conversations),
  0,
  'Carol (non-participant) cannot see any conversations'
);

-- ============================================
-- Messages SELECT: only conversation participants
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.messages WHERE conversation_id = '40000000-0000-0000-0000-000000000001'),
  1,
  'Bob can see messages in his conversation'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.messages),
  0,
  'Carol cannot see messages from other conversations'
);

-- ============================================
-- Messages INSERT: must be sender AND conversation participant
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES ('40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Hi Alice')$$,
  'Bob can send a message in his conversation'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Intruder')$$,
  NULL,
  'Carol cannot send a message in Alice-Bob conversation'
);

-- ============================================
-- Messages UPDATE: participants can mark as read
-- ============================================

SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.messages SET read = true WHERE id = '50000000-0000-0000-0000-000000000001'$$,
  'Bob can mark messages as read in his conversation'
);

SELECT tests.authenticate_as(tests.carol());
SET LOCAL ROLE authenticated;
UPDATE public.messages SET read = false WHERE id = '50000000-0000-0000-0000-000000000001';
SELECT tests.authenticate_as(tests.bob());
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT read FROM public.messages WHERE id = '50000000-0000-0000-0000-000000000001'),
  true,
  'Carol cannot update messages in Alice-Bob conversation'
);

SELECT * FROM finish();
ROLLBACK;
