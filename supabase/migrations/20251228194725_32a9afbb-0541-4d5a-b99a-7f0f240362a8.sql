-- Create table for show-specific users (players who joined a show's fantasy game)
CREATE TABLE public.show_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  gw_points INTEGER NOT NULL DEFAULT 0,
  gender TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(show_id, user_id)
);

-- Enable RLS
ALTER TABLE public.show_users ENABLE ROW LEVEL SECURITY;

-- Policies for show owners
CREATE POLICY "Users can view show_users for their shows"
ON public.show_users
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_users.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert show_users to their shows"
ON public.show_users
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_users.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update show_users of their shows"
ON public.show_users
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_users.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete show_users from their shows"
ON public.show_users
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_users.show_id AND shows.user_id = auth.uid()
));

-- Public read access for active shows
CREATE POLICY "Show users are publicly readable for active shows"
ON public.show_users
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_users.show_id AND shows.status = 'active'
));

-- Trigger for updated_at
CREATE TRIGGER update_show_users_updated_at
BEFORE UPDATE ON public.show_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();