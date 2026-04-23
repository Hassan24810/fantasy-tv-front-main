-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create shows table
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  genre TEXT,
  description TEXT,
  cover_image_url TEXT,
  season_number INTEGER DEFAULT 1,
  episode_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shows" 
ON public.shows FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shows" 
ON public.shows FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shows" 
ON public.shows FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shows" 
ON public.shows FOR DELETE 
USING (auth.uid() = user_id);

-- Create participants table (contestants on the show)
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  age INTEGER,
  occupation TEXT,
  hometown TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
  eliminated_episode INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants of their shows" 
ON public.participants FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = participants.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert participants to their shows" 
ON public.participants FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update participants of their shows" 
ON public.participants FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = participants.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete participants from their shows" 
ON public.participants FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = participants.show_id AND shows.user_id = auth.uid()
));

-- Create game_rules table
CREATE TABLE public.game_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('positive', 'negative', 'bonus')),
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rules of their shows" 
ON public.game_rules FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = game_rules.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert rules to their shows" 
ON public.game_rules FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update rules of their shows" 
ON public.game_rules FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = game_rules.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete rules from their shows" 
ON public.game_rules FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = game_rules.show_id AND shows.user_id = auth.uid()
));

-- Create leagues table
CREATE TABLE public.leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 100,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leagues of their shows" 
ON public.leagues FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = leagues.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert leagues to their shows" 
ON public.leagues FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update leagues of their shows" 
ON public.leagues FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = leagues.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete leagues from their shows" 
ON public.leagues FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = leagues.show_id AND shows.user_id = auth.uid()
));

-- Create events table (for tracking show events that affect scoring)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.game_rules(id) ON DELETE SET NULL,
  episode_number INTEGER NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events of their shows" 
ON public.events FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = events.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can insert events to their shows" 
ON public.events FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update events of their shows" 
ON public.events FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = events.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete events from their shows" 
ON public.events FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.shows WHERE shows.id = events.show_id AND shows.user_id = auth.uid()
));

-- Create storage bucket for participant photos and show assets
INSERT INTO storage.buckets (id, name, public) VALUES ('show-assets', 'show-assets', true);

-- Storage policies for show assets
CREATE POLICY "Authenticated users can upload show assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'show-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'show-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view show assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'show-assets');

CREATE POLICY "Users can delete their uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'show-assets' AND auth.role() = 'authenticated');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();