-- Create the feedback table for collecting user feedback (bugs, suggestions, etc.)

CREATE TABLE IF NOT EXISTS feedback (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES profiles(user_id) ON DELETE SET NULL,
  message    text        NOT NULL,
  mood       text        CHECK (mood IN ('frustrated', 'neutral', 'happy')),
  page_url   text        NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert feedback
CREATE POLICY "feedback_insert" ON feedback
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users can read only their own feedback
CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT
  USING (user_id = auth.uid());
