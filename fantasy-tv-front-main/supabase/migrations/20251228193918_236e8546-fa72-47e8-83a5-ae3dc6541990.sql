-- Create episodes table for show-specific episodes
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  episode_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  active_from_datetime TIMESTAMP WITH TIME ZONE,
  events_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(show_id, episode_number)
);

-- Enable RLS on episodes
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Episodes are publicly readable for active shows
CREATE POLICY "Episodes are publicly readable for active shows"
ON public.episodes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = episodes.show_id AND shows.status = 'active'
));

-- Users can view episodes of their shows
CREATE POLICY "Users can view episodes of their shows"
ON public.episodes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = episodes.show_id AND shows.user_id = auth.uid()
));

-- Users can insert episodes to their shows
CREATE POLICY "Users can insert episodes to their shows"
ON public.episodes
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = episodes.show_id AND shows.user_id = auth.uid()
));

-- Users can update episodes of their shows
CREATE POLICY "Users can update episodes of their shows"
ON public.episodes
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = episodes.show_id AND shows.user_id = auth.uid()
));

-- Users can delete episodes from their shows
CREATE POLICY "Users can delete episodes from their shows"
ON public.episodes
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = episodes.show_id AND shows.user_id = auth.uid()
));

-- Add updated_at trigger
CREATE TRIGGER update_episodes_updated_at
BEFORE UPDATE ON public.episodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();