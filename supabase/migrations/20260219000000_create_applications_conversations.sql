-- Migration: Create applications, conversations, messages, and notifications tables
-- These tables were previously created via the Supabase dashboard and lacked migration files.
-- Using IF NOT EXISTS so this migration is safe for both fresh installs and existing deployments.

-- ============================================
-- 1. APPLICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid REFERENCES public.postings(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  cover_message text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'waitlisted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (posting_id, applicant_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own applications; posting creators can view applications for their postings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view relevant applications' AND tablename = 'applications'
  ) THEN
    CREATE POLICY "Users can view relevant applications"
      ON public.applications
      FOR SELECT
      USING (
        applicant_id = auth.uid() OR
        posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
      );
  END IF;
END $$;

-- Authenticated users can apply (must be the applicant)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create applications' AND tablename = 'applications'
  ) THEN
    CREATE POLICY "Users can create applications"
      ON public.applications
      FOR INSERT
      WITH CHECK (auth.uid() = applicant_id);
  END IF;
END $$;

-- Applicants can withdraw; posting creators can accept/reject
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update relevant applications' AND tablename = 'applications'
  ) THEN
    CREATE POLICY "Users can update relevant applications"
      ON public.applications
      FOR UPDATE
      USING (
        applicant_id = auth.uid() OR
        posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
      );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS applications_posting_id_idx ON public.applications(posting_id);
CREATE INDEX IF NOT EXISTS applications_applicant_id_idx ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications(status);

-- Auto-update trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_applications_updated_at'
  ) THEN
    CREATE TRIGGER set_applications_updated_at
      BEFORE UPDATE ON public.applications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.applications IS 'Join requests for postings — pending, accepted, rejected, withdrawn, or waitlisted';
COMMENT ON COLUMN public.applications.status IS 'Application status: pending | accepted | rejected | withdrawn | waitlisted';

-- ============================================
-- 2. CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid REFERENCES public.postings(id) ON DELETE SET NULL,
  participant_1 uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  participant_2 uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants can view their own conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Participants can view conversations' AND tablename = 'conversations'
  ) THEN
    CREATE POLICY "Participants can view conversations"
      ON public.conversations
      FOR SELECT
      USING (participant_1 = auth.uid() OR participant_2 = auth.uid());
  END IF;
END $$;

-- Authenticated users can create conversations (must be a participant)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create conversations' AND tablename = 'conversations'
  ) THEN
    CREATE POLICY "Users can create conversations"
      ON public.conversations
      FOR INSERT
      WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
  END IF;
END $$;

-- Participants can update their conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Participants can update conversations' AND tablename = 'conversations'
  ) THEN
    CREATE POLICY "Participants can update conversations"
      ON public.conversations
      FOR UPDATE
      USING (participant_1 = auth.uid() OR participant_2 = auth.uid());
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS conversations_participant_1_idx ON public.conversations(participant_1);
CREATE INDEX IF NOT EXISTS conversations_participant_2_idx ON public.conversations(participant_2);
CREATE INDEX IF NOT EXISTS conversations_posting_id_idx ON public.conversations(posting_id);

-- Auto-update trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_conversations_updated_at'
  ) THEN
    CREATE TRIGGER set_conversations_updated_at
      BEFORE UPDATE ON public.conversations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================
-- 3. MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Participants of the conversation can view messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Conversation participants can view messages' AND tablename = 'messages'
  ) THEN
    CREATE POLICY "Conversation participants can view messages"
      ON public.messages
      FOR SELECT
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
      );
  END IF;
END $$;

-- Participants can send messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages' AND tablename = 'messages'
  ) THEN
    CREATE POLICY "Users can send messages"
      ON public.messages
      FOR INSERT
      WITH CHECK (
        auth.uid() = sender_id AND
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
      );
  END IF;
END $$;

-- Participants can update messages (mark as read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Participants can update messages' AND tablename = 'messages'
  ) THEN
    CREATE POLICY "Participants can update messages"
      ON public.messages
      FOR UPDATE
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
      );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- ============================================
-- 4. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean DEFAULT false,
  related_posting_id uuid REFERENCES public.postings(id) ON DELETE SET NULL,
  related_application_id uuid,
  related_user_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.notifications
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Authenticated users can create notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Authenticated users can create notifications"
      ON public.notifications
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Users can update their own notifications (mark as read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.notifications
      FOR UPDATE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Users can delete their own notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications"
      ON public.notifications
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at);

-- ============================================
-- 5. REALTIME (ensure tables are in publication)
-- ============================================

DO $$ BEGIN
  -- Only add if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE applications;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
