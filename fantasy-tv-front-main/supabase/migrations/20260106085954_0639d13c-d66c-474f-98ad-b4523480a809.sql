-- Update RLS policies on shows table to allow access via admin_permissions
DROP POLICY IF EXISTS "Users can view their own shows" ON shows;
DROP POLICY IF EXISTS "Users can view shows they are members of" ON shows;

CREATE POLICY "Users can view shows they own or are members of"
ON shows FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM admin_permissions 
    WHERE admin_permissions.show_id = shows.id 
    AND admin_permissions.user_id = auth.uid()
  )
);

-- Update INSERT policy
DROP POLICY IF EXISTS "Users can insert their own shows" ON shows;
CREATE POLICY "Users can insert their own shows"
ON shows FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update their own shows" ON shows;
CREATE POLICY "Users can update shows they own or are admin of"
ON shows FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM admin_permissions 
    WHERE admin_permissions.show_id = shows.id 
    AND admin_permissions.user_id = auth.uid()
    AND admin_permissions.role IN ('owner', 'admin')
  )
);

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete their own shows" ON shows;
CREATE POLICY "Users can delete shows they own"
ON shows FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger function to auto-add owner to admin_permissions on show creation
CREATE OR REPLACE FUNCTION public.create_show_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_permissions (show_id, user_id, email, role, can_publish_episodes)
  SELECT NEW.id, NEW.user_id, 
    (SELECT email FROM auth.users WHERE id = NEW.user_id),
    'owner',
    true
  ON CONFLICT (show_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on shows table
DROP TRIGGER IF EXISTS on_show_created ON shows;
CREATE TRIGGER on_show_created
  AFTER INSERT ON shows
  FOR EACH ROW EXECUTE FUNCTION public.create_show_owner_membership();

-- Backfill existing shows into admin_permissions (add owners who aren't already there)
INSERT INTO admin_permissions (show_id, user_id, email, role, can_publish_episodes)
SELECT s.id, s.user_id, u.email, 'owner', true
FROM shows s
JOIN auth.users u ON u.id = s.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM admin_permissions ap 
  WHERE ap.show_id = s.id AND ap.user_id = s.user_id
);