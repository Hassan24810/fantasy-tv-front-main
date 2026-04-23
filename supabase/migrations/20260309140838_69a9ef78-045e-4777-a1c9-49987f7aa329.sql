
-- Allow show owners to view all admin_permissions for their shows
CREATE POLICY "Show owners can view all admin permissions"
ON public.admin_permissions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM shows
    WHERE shows.id = admin_permissions.show_id
    AND shows.user_id = auth.uid()
  )
);
