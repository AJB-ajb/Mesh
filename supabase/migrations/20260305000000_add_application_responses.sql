-- Add responses JSONB column to applications for storing question answers
-- and time selection data from the acceptance card.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS responses jsonb DEFAULT '{}';

COMMENT ON COLUMN applications.responses IS
  'Stores acceptance-card responses: question answers, time selection, and metadata';
