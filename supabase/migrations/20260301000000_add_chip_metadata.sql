-- Add chip_metadata column for inline metadata chips
ALTER TABLE public.postings ADD COLUMN IF NOT EXISTS chip_metadata jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.postings.chip_metadata IS 'Structured metadata for inline editor chips (locations, times, skills). Keys are metadataKey references, values are {type, display, data} objects.';
