-- Add the episode_duration_seconds column
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS episode_duration_seconds integer DEFAULT 3600;

-- Migrate existing data: convert minutes to seconds
UPDATE public.episodes 
SET episode_duration_seconds = COALESCE(episode_duration_minutes, 60) * 60
WHERE episode_duration_seconds IS NULL OR episode_duration_seconds = 3600;