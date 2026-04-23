
-- Add status column to admin_permissions
ALTER TABLE public.admin_permissions ADD COLUMN status text NOT NULL DEFAULT 'accepted';

-- Function: get pending invitations by email
CREATE OR REPLACE FUNCTION public.get_pending_invitations_for_email(p_email text)
RETURNS TABLE(
  id uuid,
  show_id uuid,
  role text,
  can_publish_episodes boolean,
  invited_at timestamptz,
  show_name text,
  season_number integer,
  show_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ap.id,
    ap.show_id,
    ap.role,
    ap.can_publish_episodes,
    ap.invited_at,
    s.name as show_name,
    s.season_number,
    s.status as show_status
  FROM public.admin_permissions ap
  JOIN public.shows s ON s.id = ap.show_id
  WHERE lower(ap.email) = lower(p_email)
    AND ap.status = 'pending';
$$;

-- Function: accept an invitation
CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_invitation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Find the pending invitation matching user's email
  SELECT * INTO v_invitation 
  FROM public.admin_permissions 
  WHERE id = p_invitation_id 
    AND status = 'pending'
    AND lower(email) = lower(v_user_email);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found or already accepted');
  END IF;

  -- Update with real user_id and set accepted
  UPDATE public.admin_permissions
  SET user_id = v_user_id,
      status = 'accepted',
      updated_at = now()
  WHERE id = p_invitation_id;

  RETURN json_build_object('success', true, 'show_id', v_invitation.show_id);
END;
$$;

-- Function: decline an invitation
CREATE OR REPLACE FUNCTION public.decline_admin_invitation(p_invitation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  DELETE FROM public.admin_permissions
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND lower(email) = lower(v_user_email);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
