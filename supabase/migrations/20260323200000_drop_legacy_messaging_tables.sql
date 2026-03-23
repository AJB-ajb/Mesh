-- Drop legacy messaging tables replaced by space_messages
-- These tables have zero active code references after the Spaces rewrite

-- Drop dependent tables first
DROP TABLE IF EXISTS group_message_reads CASCADE;
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Clean up associated functions
DROP FUNCTION IF EXISTS unread_group_message_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS unread_group_message_counts() CASCADE;
DROP FUNCTION IF EXISTS is_team_member(uuid) CASCADE;
