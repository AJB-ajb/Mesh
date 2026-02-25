-- Migration: Add composite indexes for high-frequency filtered queries

-- Posting discovery: status + expires_at covers the most common filter pair
CREATE INDEX IF NOT EXISTS postings_status_expires_idx
  ON postings (status, expires_at DESC)
  WHERE status = 'open';

-- Messages: conversation unread count + ordering
CREATE INDEX IF NOT EXISTS messages_conv_read_created_idx
  ON messages (conversation_id, read, created_at DESC);

-- Notifications: user unread list
CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx
  ON notifications (user_id, read, created_at DESC);

-- Friendships: bidirectional status lookup
CREATE INDEX IF NOT EXISTS friendships_user_status_idx
  ON friendships (user_id, status);

CREATE INDEX IF NOT EXISTS friendships_friend_status_idx
  ON friendships (friend_id, status);
