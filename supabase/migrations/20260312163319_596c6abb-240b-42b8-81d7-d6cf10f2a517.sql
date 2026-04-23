
-- Fix 1: Restrict show_users public SELECT to authenticated users only
DROP POLICY IF EXISTS "Show users are publicly readable for active shows" ON public.show_users;

CREATE POLICY "Show users readable by authenticated users for active shows"
ON public.show_users FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_users.show_id AND shows.status = 'active'
));

-- Fix 2: Tighten storage policies for show-assets bucket
DROP POLICY IF EXISTS "Authenticated users can upload show assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Show assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update show assets" ON storage.objects;

-- Allow uploads only to paths matching show IDs the user owns
CREATE POLICY "Show owners can upload show assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.shows WHERE user_id = auth.uid()
  )
);

-- Allow updates only to own uploads
CREATE POLICY "Show owners can update show assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.shows WHERE user_id = auth.uid()
  )
);

-- Allow deletes only for own uploads (by owner field)
CREATE POLICY "Users can only delete their own show assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'show-assets'
  AND (auth.uid())::text = (owner_id)::text
);

-- Keep public read access for show assets (images need to be viewable)
CREATE POLICY "Show assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'show-assets');

-- Fix 3: Tighten storage policies for rule-icons bucket
DROP POLICY IF EXISTS "Authenticated users can upload rule icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update rule icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete rule icons" ON storage.objects;
DROP POLICY IF EXISTS "Rule icons are publicly readable" ON storage.objects;

CREATE POLICY "Show owners can upload rule icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rule-icons'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can only delete their own rule icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rule-icons'
  AND (auth.uid())::text = (owner_id)::text
);

CREATE POLICY "Rule icons are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'rule-icons');
