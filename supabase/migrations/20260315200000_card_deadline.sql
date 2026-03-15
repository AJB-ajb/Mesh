-- Add deadline column to space_cards
ALTER TABLE space_cards ADD COLUMN deadline timestamptz;
