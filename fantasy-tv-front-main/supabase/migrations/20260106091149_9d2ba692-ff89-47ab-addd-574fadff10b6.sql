-- Fix RLS policies on admin_permissions to allow users to see their own memberships

-- Drop the restrictive SELECT policy that only allows show owners to view
DROP POLICY IF EXISTS "Users can view admin permissions for their shows" ON admin_permissions;

-- Create new policy that lets users see their own memberships
CREATE POLICY "Users can view their own admin permissions"
ON admin_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Drop and recreate INSERT/UPDATE/DELETE policies with clearer naming
DROP POLICY IF EXISTS "Users can insert admin permissions for their shows" ON admin_permissions;
DROP POLICY IF EXISTS "Users can update admin permissions for their shows" ON admin_permissions;
DROP POLICY IF EXISTS "Users can delete admin permissions for their shows" ON admin_permissions;

-- Show owners can manage admin_permissions for their shows
CREATE POLICY "Show owners can insert admin permissions"
ON admin_permissions FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid())
);

CREATE POLICY "Show owners can update admin permissions"
ON admin_permissions FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid())
);

CREATE POLICY "Show owners can delete admin permissions"
ON admin_permissions FOR DELETE
USING (
  EXISTS (SELECT 1 FROM shows WHERE shows.id = admin_permissions.show_id AND shows.user_id = auth.uid())
);