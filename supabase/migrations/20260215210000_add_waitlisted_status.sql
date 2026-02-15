-- Add 'waitlisted' to application status values
-- When a posting is filled, new join requests are automatically waitlisted.
-- If an accepted user withdraws, the first waitlisted user is promoted.

-- The applications table uses a text column for status (no enum constraint).
-- Just document the valid values here:
-- Valid statuses: pending, accepted, rejected, withdrawn, waitlisted

-- Only add comment if table exists (it may not exist on all environments yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'status'
  ) THEN
    COMMENT ON COLUMN public.applications.status IS
      'Application status: pending | accepted | rejected | withdrawn | waitlisted';
  END IF;
END
$$;
