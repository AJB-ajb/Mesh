-- Fix notifications_type_check constraint.
-- If a CHECK constraint on the "type" column exists, drop and recreate it
-- with all currently valid notification types.
-- If none exists, create it.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'interest_received',
      'application_received',
      'application_accepted',
      'application_rejected',
      'friend_request',
      'sequential_invite',
      'new_message',
      'new_group_message',
      'match_found',
      'meeting_proposal'
    )
  );
