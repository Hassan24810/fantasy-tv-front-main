-- Fix infinite recursion in league_members RLS
-- The existing policy queries league_members within itself, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "League members can view each other" ON league_members;

-- Create a new policy that avoids self-referential queries
CREATE POLICY "League members can view their leagues and show owners can view all" 
ON league_members
FOR SELECT
USING (
  -- Own memberships (no recursion - direct column check)
  league_members.user_id = auth.uid()
  OR
  -- Show owner can see all memberships for their show
  EXISTS (
    SELECT 1 FROM shows 
    WHERE shows.id = league_members.show_id 
    AND shows.user_id = auth.uid()
  )
);