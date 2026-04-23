-- Enable full replica identity for game_settings (real-time updates)
ALTER TABLE public.game_settings REPLICA IDENTITY FULL;

-- Enable full replica identity for branding_settings (real-time updates)
ALTER TABLE public.branding_settings REPLICA IDENTITY FULL;