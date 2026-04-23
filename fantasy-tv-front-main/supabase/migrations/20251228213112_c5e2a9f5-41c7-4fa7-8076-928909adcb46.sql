-- Add policy for events to be publicly readable for active shows
CREATE POLICY "Events are publicly readable for active shows" 
ON public.events 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM shows
  WHERE ((shows.id = events.show_id) AND (shows.status = 'active'::text))));