-- Enable full replica identity for realtime
ALTER TABLE public.landing_page_content REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_page_content;