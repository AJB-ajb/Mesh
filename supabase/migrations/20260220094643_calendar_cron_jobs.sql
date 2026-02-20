-- Migration: pg_cron jobs for calendar background sync
-- Uses pg_net to call the sync-all API route on a schedule.
-- Note: CALENDAR_SYNC_CRON_SECRET and app URL must be configured as
-- Supabase vault secrets or set in the cron job after deployment.
-- This migration creates the cron jobs; the actual secret is injected
-- at deploy time via `ALTER ... SET ...` or vault.

-- Enable required extensions (pg_cron is enabled by default on Supabase,
-- pg_net needs to be enabled via dashboard or migration)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- Google Calendar sync: every 15 minutes
-- ============================================
-- Note: The URL and Authorization header must be updated after deployment
-- with the actual production URL and CALENDAR_SYNC_CRON_SECRET.
-- This is a placeholder that will be configured via Supabase dashboard.

-- SELECT cron.schedule(
--   'calendar-sync-google',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_APP_URL/api/calendar/sync-all',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- iCal sync: every 30 minutes (uses same endpoint)
-- The sync-all endpoint handles both Google and iCal connections,
-- so a single cron job suffices. The 15-min schedule above covers both.
-- ============================================

-- To set up after deployment:
-- 1. Go to Supabase Dashboard → Database → Extensions → Enable pg_cron and pg_net
-- 2. Run the SELECT cron.schedule(...) above with your actual URL and secret
-- 3. Or use: supabase db execute to run it against the live DB
