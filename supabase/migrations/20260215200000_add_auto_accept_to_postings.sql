-- Add auto_accept field to postings
-- When true: users who join are instantly accepted ("Join" CTA)
-- When false: users must be manually approved by the poster ("Request to join" CTA)
ALTER TABLE public.postings
  ADD COLUMN IF NOT EXISTS auto_accept boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.postings.auto_accept IS
  'If true, applicants are instantly accepted. If false, poster must manually approve.';
