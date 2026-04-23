-- Add event_offset_seconds column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_offset_seconds INTEGER DEFAULT 0;

-- Migrate existing data from minutes to seconds
UPDATE public.events 
SET event_offset_seconds = COALESCE(event_offset_minutes, 0) * 60
WHERE event_offset_seconds IS NULL OR event_offset_seconds = 0;