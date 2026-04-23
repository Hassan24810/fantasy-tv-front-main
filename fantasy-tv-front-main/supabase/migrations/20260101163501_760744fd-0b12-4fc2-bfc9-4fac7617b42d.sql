-- Add language column to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';