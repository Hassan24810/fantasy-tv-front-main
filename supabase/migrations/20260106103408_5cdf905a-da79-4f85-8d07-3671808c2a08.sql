-- Add unique index on email per show for explicit email uniqueness validation
CREATE UNIQUE INDEX IF NOT EXISTS show_users_show_email_unique 
ON show_users (show_id, LOWER(TRIM(email)));