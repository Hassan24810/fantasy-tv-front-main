-- Create game_settings table for team rules, transfers, roster constraints, and scoring
CREATE TABLE public.game_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  
  -- Team Rules
  team_size INTEGER NOT NULL DEFAULT 5,
  min_boys INTEGER NOT NULL DEFAULT 0,
  min_girls INTEGER NOT NULL DEFAULT 0,
  max_boys INTEGER,
  max_girls INTEGER,
  
  -- Transfers & Lineup Windows
  transfer_reset_frequency TEXT NOT NULL DEFAULT 'weekly', -- daily, weekly, per_episode, custom
  transfers_per_reset INTEGER NOT NULL DEFAULT 2,
  transfer_window_mode TEXT NOT NULL DEFAULT 'always_open', -- always_open, time_window, locked_during_live
  transfer_windows JSONB DEFAULT '[]'::jsonb, -- Array of {start: datetime, end: datetime}
  
  -- Roster Constraints
  max_players_per_category INTEGER,
  budget_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  budget_amount INTEGER,
  lock_roster_after_episode BOOLEAN NOT NULL DEFAULT false,
  wildcard_enabled BOOLEAN NOT NULL DEFAULT false,
  free_hit_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Scoring & Gameplay
  scoring_profile TEXT NOT NULL DEFAULT 'standard',
  bonus_points_enabled BOOLEAN NOT NULL DEFAULT true,
  tiebreak_rule TEXT DEFAULT 'total_points', -- total_points, head_to_head, recent_form
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(show_id)
);

-- Create branding_settings table
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  
  logo_url TEXT,
  background_image_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(show_id)
);

-- Create admin_permissions table for producer access control
CREATE TABLE public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- admin, editor, viewer
  can_publish_episodes BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(show_id, user_id)
);

-- Enable RLS
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_settings
CREATE POLICY "Users can view game settings for their shows"
ON public.game_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = game_settings.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert game settings for their shows"
ON public.game_settings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = game_settings.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update game settings for their shows"
ON public.game_settings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = game_settings.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete game settings for their shows"
ON public.game_settings FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = game_settings.show_id AND shows.user_id = auth.uid()
));

-- RLS Policies for branding_settings
CREATE POLICY "Users can view branding settings for their shows"
ON public.branding_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = branding_settings.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert branding settings for their shows"
ON public.branding_settings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = branding_settings.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update branding settings for their shows"
ON public.branding_settings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = branding_settings.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete branding settings for their shows"
ON public.branding_settings FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = branding_settings.show_id AND shows.user_id = auth.uid()
));

-- RLS Policies for admin_permissions
CREATE POLICY "Users can view admin permissions for their shows"
ON public.admin_permissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert admin permissions for their shows"
ON public.admin_permissions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update admin permissions for their shows"
ON public.admin_permissions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete admin permissions for their shows"
ON public.admin_permissions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_game_settings_updated_at
BEFORE UPDATE ON public.game_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();