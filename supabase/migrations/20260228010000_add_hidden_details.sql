-- Add hidden details text field to postings (revealed only after acceptance)
ALTER TABLE postings ADD COLUMN IF NOT EXISTS hidden_details text;
