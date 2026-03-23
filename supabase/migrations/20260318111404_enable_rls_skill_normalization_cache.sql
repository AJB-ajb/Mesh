-- Enable RLS on skill_normalization_cache to satisfy Supabase security linter.
-- No policies needed: this table is only accessed via the service role (bypasses RLS).
ALTER TABLE skill_normalization_cache ENABLE ROW LEVEL SECURITY;
