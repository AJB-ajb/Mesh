-- Add source_text and undo columns to postings (mirrors profiles pattern)
ALTER TABLE public.postings
  ADD COLUMN IF NOT EXISTS source_text text,
  ADD COLUMN IF NOT EXISTS previous_source_text text,
  ADD COLUMN IF NOT EXISTS previous_posting_snapshot jsonb;
