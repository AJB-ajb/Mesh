-- Add screenshot and debug metadata columns to feedback table

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS metadata       jsonb;

-- Create storage bucket for feedback screenshots (public read so we can view them)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload screenshots (matches feedback insert policy)
CREATE POLICY "feedback_screenshots_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'feedback-screenshots');

-- Allow public read access to feedback screenshots
CREATE POLICY "feedback_screenshots_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'feedback-screenshots');
