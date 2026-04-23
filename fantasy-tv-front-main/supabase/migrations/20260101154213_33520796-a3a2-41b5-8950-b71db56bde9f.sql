-- Create landing_page_content table for customizable B2C content
CREATE TABLE public.landing_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL UNIQUE,
  
  -- What's This All About? section
  about_title TEXT DEFAULT 'What''s This All About?',
  about_description TEXT,
  about_items JSONB DEFAULT '[]',
  
  -- How It Works section
  how_it_works_title TEXT DEFAULT 'How It Works',
  how_it_works_subtitle TEXT,
  how_it_works_cards JSONB DEFAULT '[]',
  
  -- FAQ section
  faq_title TEXT DEFAULT 'Frequently Asked Questions',
  faq_items JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Landing page content is publicly readable for active shows"
ON public.landing_page_content
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = landing_page_content.show_id
  AND shows.status = 'active'
));

CREATE POLICY "Users can view landing page content for their shows"
ON public.landing_page_content
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = landing_page_content.show_id
  AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert landing page content for their shows"
ON public.landing_page_content
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = landing_page_content.show_id
  AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update landing page content for their shows"
ON public.landing_page_content
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = landing_page_content.show_id
  AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete landing page content for their shows"
ON public.landing_page_content
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows
  WHERE shows.id = landing_page_content.show_id
  AND shows.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_landing_page_content_updated_at
BEFORE UPDATE ON public.landing_page_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();