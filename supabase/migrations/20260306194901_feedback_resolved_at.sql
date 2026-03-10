-- Add resolved_at column to feedback table for triage workflow
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
