-- Fix existing duplicate username (rename second "niny" to "niny_1")
UPDATE show_users 
SET username = 'niny_1'
WHERE id = '4b1af9d5-8136-40dd-9e48-3fb8ee2fdf72';

-- Create case-insensitive, trimmed unique index for username per show
CREATE UNIQUE INDEX show_users_show_username_unique 
ON show_users (show_id, LOWER(TRIM(username)));