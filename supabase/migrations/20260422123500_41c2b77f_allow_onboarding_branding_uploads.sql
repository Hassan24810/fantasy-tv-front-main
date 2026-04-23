-- Allow onboarding uploads to temporary branding/* paths.
-- These uploads happen before show_id exists, so uuid-folder checks do not apply.

DROP POLICY IF EXISTS "Show managers can upload show assets" ON storage.objects;
DROP POLICY IF EXISTS "Show managers can update show assets" ON storage.objects;
DROP POLICY IF EXISTS "Show managers can delete show assets" ON storage.objects;

CREATE POLICY "Show managers and onboarding can upload show assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (
    (
      (storage.foldername(name))[1] = 'branding'
      AND (storage.foldername(name))[2] IS NOT NULL
    )
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Show managers and onboarding can update show assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (
    (
      (storage.foldername(name))[1] = 'branding'
      AND (storage.foldername(name))[2] IS NOT NULL
    )
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
    )
  )
)
WITH CHECK (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (
    (
      (storage.foldername(name))[1] = 'branding'
      AND (storage.foldername(name))[2] IS NOT NULL
    )
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Show managers and onboarding can delete show assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'show-assets'
  AND auth.uid() IS NOT NULL
  AND (
    (
      (storage.foldername(name))[1] = 'branding'
      AND (storage.foldername(name))[2] IS NOT NULL
    )
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND public.can_manage_show_assets(((storage.foldername(name))[1])::uuid)
    )
  )
);
