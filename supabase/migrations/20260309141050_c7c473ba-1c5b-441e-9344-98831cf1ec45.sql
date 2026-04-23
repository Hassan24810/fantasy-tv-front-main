
-- Drop the recursive policy
DROP POLICY IF EXISTS "Show owners can view all admin permissions" ON public.admin_permissions;

-- Create a security definer function to check show ownership without RLS
CREATE OR REPLACE FUNCTION public.is_show_owner(p_show_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shows
    WHERE id = p_show_id AND user_id = auth.uid()
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Show owners can view all admin permissions"
ON public.admin_permissions
FOR SELECT
TO public
USING (
  public.is_show_owner(show_id)
);
