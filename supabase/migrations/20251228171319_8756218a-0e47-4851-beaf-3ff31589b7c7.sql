-- Add public read policies for B2C site
-- Shows with status 'active' should be publicly readable
CREATE POLICY "Active shows are publicly readable" 
ON public.shows 
FOR SELECT 
USING (status = 'active');

-- Participants of active shows should be publicly readable
CREATE POLICY "Participants are publicly readable for active shows" 
ON public.participants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shows 
  WHERE shows.id = participants.show_id 
  AND shows.status = 'active'
));

-- Game rules of active shows should be publicly readable
CREATE POLICY "Game rules are publicly readable for active shows" 
ON public.game_rules 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shows 
  WHERE shows.id = game_rules.show_id 
  AND shows.status = 'active'
));

-- Branding settings of active shows should be publicly readable
CREATE POLICY "Branding settings are publicly readable for active shows" 
ON public.branding_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shows 
  WHERE shows.id = branding_settings.show_id 
  AND shows.status = 'active'
));

-- Game settings of active shows should be publicly readable
CREATE POLICY "Game settings are publicly readable for active shows" 
ON public.game_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shows 
  WHERE shows.id = game_settings.show_id 
  AND shows.status = 'active'
));

-- Leagues of active shows should be publicly readable
CREATE POLICY "Leagues are publicly readable for active shows" 
ON public.leagues 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shows 
  WHERE shows.id = leagues.show_id 
  AND shows.status = 'active'
));