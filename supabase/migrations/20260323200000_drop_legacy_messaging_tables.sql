-- Drop legacy messaging tables fully replaced by space_messages
DROP TABLE IF EXISTS group_message_reads CASCADE;
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Drop associated functions (only used by group_messages RLS)
DROP FUNCTION IF EXISTS is_team_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS unread_group_message_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS unread_group_message_counts() CASCADE;
