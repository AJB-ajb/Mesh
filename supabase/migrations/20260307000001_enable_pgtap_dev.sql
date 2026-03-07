-- Enable pgTAP extension for running RLS tests against the remote dev DB.
-- Zero runtime overhead — only used by `supabase test db --linked`.
CREATE EXTENSION IF NOT EXISTS pgtap SCHEMA extensions;
