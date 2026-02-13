-- Add notification_preferences column to profiles table
ALTER TABLE profiles ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{
  "in_app": {
    "interest_received": true,
    "application_accepted": true,
    "application_rejected": true,
    "friend_request": true,
    "new_message": true,
    "match_found": true
  },
  "browser": {
    "interest_received": true,
    "application_accepted": true,
    "application_rejected": false,
    "friend_request": true,
    "new_message": true,
    "match_found": false
  }
}'::jsonb;
