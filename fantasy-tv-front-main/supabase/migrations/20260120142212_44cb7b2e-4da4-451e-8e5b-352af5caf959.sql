-- Add social media columns to branding_settings table
ALTER TABLE public.branding_settings 
ADD COLUMN IF NOT EXISTS facebook_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS twitter_username TEXT,
ADD COLUMN IF NOT EXISTS tiktok_username TEXT;