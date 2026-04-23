-- Allow delegated show admins to manage show-assets uploads
-- while keeping access scoped to the show's root folder.

-- Security-definer helper to check if current user can manage assets
-- for a specific show id.
CREATE OR REPLACE FUNCTION public.can_manage_show_assets(p_show_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shows s
    WHERE s.id = p_show_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_permissions ap
    WHERE ap.show_id = p_show_id
      AND ap.user_id = auth.uid()
      AND ap.status = 'accepted'
      AND ap.role IN ('owner', 'admin', 'editor')
  );
$$;

-- Replace restrictive show-assets policies with role-aware policies.
DROP POLICY IF EXISTS "Show owners can upload show assets" ON storage.objects;
DROP POLICY IF EXISTS "Show owners can update show assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can only delete their own show assets" ON storage.objects;

CREATE POLICY "Show managers can upload show assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Show managers can update show assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Show managers can delete show assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
);
