-- Migration: Create group_messages and group_message_reads tables
-- Group chat is per-posting (one chat per posting). Team membership is defined
-- by postings.creator_id OR applications WHERE status = 'accepted'.

-- ============================================
-- 1. GROUP_MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid REFERENCES public.postings(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user is a team member of a given posting
-- (creator OR accepted applicant)
CREATE OR REPLACE FUNCTION public.is_team_member(p_posting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.postings WHERE id = p_posting_id AND creator_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.applications
    WHERE posting_id = p_posting_id
      AND applicant_id = auth.uid()
      AND status = 'accepted'
  )
$$;

-- SELECT: team members only
CREATE POLICY "Team members can view group messages"
  ON public.group_messages
  FOR SELECT
  USING (public.is_team_member(posting_id));

-- INSERT: team members only, sender must be current user
CREATE POLICY "Team members can send group messages"
  ON public.group_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.is_team_member(posting_id)
  );

-- Indexes for ordered retrieval and lookups
CREATE INDEX IF NOT EXISTS group_messages_posting_id_created_at_idx
  ON public.group_messages(posting_id, created_at);
CREATE INDEX IF NOT EXISTS group_messages_sender_id_idx
  ON public.group_messages(sender_id);

COMMENT ON TABLE public.group_messages IS 'Group chat messages for a posting — one chat per posting';

-- ============================================
-- 2. GROUP_MESSAGE_READS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;

-- SELECT: users can view their own read receipts
CREATE POLICY "Users can view own group message reads"
  ON public.group_message_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: users can mark messages as read for themselves
CREATE POLICY "Users can insert own group message reads"
  ON public.group_message_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS group_message_reads_message_id_idx
  ON public.group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS group_message_reads_user_id_idx
  ON public.group_message_reads(user_id);

COMMENT ON TABLE public.group_message_reads IS 'Per-user read tracking for group messages';

-- ============================================
-- 3. RPC FUNCTIONS
-- ============================================

-- Single posting unread count for a user
CREATE OR REPLACE FUNCTION public.unread_group_message_count(
  p_posting_id uuid,
  p_user_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.group_messages gm
  WHERE gm.posting_id = p_posting_id
    AND NOT EXISTS (
      SELECT 1 FROM public.group_message_reads gmr
      WHERE gmr.message_id = gm.id
        AND gmr.user_id = p_user_id
    )
    AND gm.sender_id != p_user_id
$$;

-- Batch unread counts for multiple postings (for the Active page)
CREATE OR REPLACE FUNCTION public.unread_group_message_counts(
  p_posting_ids uuid[],
  p_user_id uuid
)
RETURNS TABLE(posting_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gm.posting_id,
    COUNT(*) AS unread_count
  FROM public.group_messages gm
  WHERE gm.posting_id = ANY(p_posting_ids)
    AND gm.sender_id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.group_message_reads gmr
      WHERE gmr.message_id = gm.id
        AND gmr.user_id = p_user_id
    )
  GROUP BY gm.posting_id
$$;

-- ============================================
-- 4. REALTIME
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
  END IF;
END $$;
