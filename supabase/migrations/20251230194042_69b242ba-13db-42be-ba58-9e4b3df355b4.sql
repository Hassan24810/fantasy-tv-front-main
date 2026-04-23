-- =============================================
-- PHASE 2: RPC FUNCTIONS (11 total)
-- =============================================

-- =============================================
-- 2.1 get_league_leaderboard - Single aggregated query with LIVE points
-- =============================================
CREATE OR REPLACE FUNCTION public.get_league_leaderboard(p_league_id UUID)
RETURNS TABLE(
  member_id UUID,
  user_id UUID,
  show_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  gameweek_points BIGINT,
  team_size BIGINT,
  rank BIGINT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_show_id UUID;
  v_active_episode_number INTEGER;
BEGIN
  -- Get show_id from league
  SELECT l.show_id INTO v_show_id
  FROM leagues l
  WHERE l.id = p_league_id;
  
  IF v_show_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get current active episode number
  SELECT e.episode_number INTO v_active_episode_number
  FROM episodes e
  WHERE e.show_id = v_show_id
    AND (e.is_active = true OR (e.active_from_datetime IS NOT NULL AND e.active_from_datetime <= now()))
  ORDER BY e.episode_number DESC
  LIMIT 1;
  
  RETURN QUERY
  WITH visible_episodes AS (
    SELECT ep.episode_number
    FROM episodes ep
    WHERE ep.show_id = v_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  member_points AS (
    SELECT 
      lm.id AS member_id,
      lm.user_id,
      lm.show_user_id,
      lm.joined_at,
      COALESCE(SUM(
        CASE 
          WHEN ve.episode_number IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points,
      COALESCE(SUM(
        CASE 
          WHEN ev.episode_number = v_active_episode_number
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS gameweek_points
    FROM league_members lm
    LEFT JOIN user_teams ut ON ut.user_id = lm.user_id AND ut.show_id = v_show_id
    LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = v_show_id
    LEFT JOIN visible_episodes ve ON ve.episode_number = ev.episode_number
    WHERE lm.league_id = p_league_id
    GROUP BY lm.id, lm.user_id, lm.show_user_id, lm.joined_at
  ),
  member_team_size AS (
    SELECT 
      lm.user_id AS mts_user_id,
      COUNT(ut.id)::BIGINT AS team_size
    FROM league_members lm
    LEFT JOIN user_teams ut ON ut.user_id = lm.user_id 
      AND ut.show_id = v_show_id 
      AND ut.removed_episode IS NULL
    WHERE lm.league_id = p_league_id
    GROUP BY lm.user_id
  )
  SELECT 
    mp.member_id,
    mp.user_id,
    mp.show_user_id,
    su.username,
    su.avatar_url,
    mp.total_points,
    mp.gameweek_points,
    COALESCE(mts.team_size, 0)::BIGINT AS team_size,
    RANK() OVER (ORDER BY mp.total_points DESC)::BIGINT AS rank,
    mp.joined_at
  FROM member_points mp
  JOIN show_users su ON su.id = mp.show_user_id
  LEFT JOIN member_team_size mts ON mts.mts_user_id = mp.user_id
  ORDER BY mp.total_points DESC;
END;
$$;

-- =============================================
-- 2.2 create_league_with_membership - Atomic create + auto-join
-- =============================================
CREATE OR REPLACE FUNCTION public.create_league_with_membership(
  p_show_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_show_user RECORD;
  v_league_id UUID;
  v_invite_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Validate user is registered for this show
  SELECT id INTO v_show_user FROM show_users 
  WHERE show_id = p_show_id AND user_id = v_user_id;
  
  IF v_show_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be registered for this show', 'error_code', 'NOT_REGISTERED');
  END IF;
  
  -- Validate show exists and is active
  IF NOT EXISTS (SELECT 1 FROM shows WHERE id = p_show_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive show', 'error_code', 'INVALID_SHOW');
  END IF;
  
  -- Generate invite code
  v_invite_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3) || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  
  -- Create league
  INSERT INTO leagues (show_id, name, description, is_public, invite_code)
  VALUES (p_show_id, p_name, p_description, p_is_public, v_invite_code)
  RETURNING id INTO v_league_id;
  
  -- Auto-join creator
  INSERT INTO league_members (league_id, show_id, show_user_id, user_id)
  VALUES (v_league_id, p_show_id, v_show_user.id, v_user_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'league_id', v_league_id, 
    'invite_code', v_invite_code
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'A league with this name already exists', 'error_code', 'NAME_EXISTS');
END;
$$;

-- =============================================
-- 2.3 join_league_by_code - Join by invite code
-- =============================================
CREATE OR REPLACE FUNCTION public.join_league_by_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_league RECORD;
  v_show_user RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Find league by invite code
  SELECT l.*, s.status AS show_status INTO v_league
  FROM leagues l
  JOIN shows s ON s.id = l.show_id
  WHERE l.invite_code = UPPER(TRIM(p_invite_code));
  
  IF v_league.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code', 'error_code', 'INVALID_CODE');
  END IF;
  
  IF v_league.show_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This show is not active', 'error_code', 'SHOW_INACTIVE');
  END IF;
  
  -- Check user is registered for this show
  SELECT id INTO v_show_user FROM show_users 
  WHERE show_id = v_league.show_id AND user_id = v_user_id;
  
  IF v_show_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be registered for this show', 'error_code', 'NOT_REGISTERED');
  END IF;
  
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM league_members WHERE league_id = v_league.id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member', 'error_code', 'ALREADY_MEMBER');
  END IF;
  
  -- Check max members
  IF v_league.max_members IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM league_members WHERE league_id = v_league.id) >= v_league.max_members THEN
      RETURN jsonb_build_object('success', false, 'error', 'League is full', 'error_code', 'LEAGUE_FULL');
    END IF;
  END IF;
  
  -- Join league
  INSERT INTO league_members (league_id, show_id, show_user_id, user_id)
  VALUES (v_league.id, v_league.show_id, v_show_user.id, v_user_id);
  
  RETURN jsonb_build_object('success', true, 'league_id', v_league.id, 'league_name', v_league.name);
END;
$$;

-- =============================================
-- 2.4 join_league_public - Join public league by ID
-- =============================================
CREATE OR REPLACE FUNCTION public.join_league_public(p_league_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_league RECORD;
  v_show_user RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Get league
  SELECT l.*, s.status AS show_status INTO v_league
  FROM leagues l
  JOIN shows s ON s.id = l.show_id
  WHERE l.id = p_league_id;
  
  IF v_league.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'League not found', 'error_code', 'NOT_FOUND');
  END IF;
  
  IF v_league.is_public = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'This league requires an invite code', 'error_code', 'PRIVATE_LEAGUE');
  END IF;
  
  IF v_league.show_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This show is not active', 'error_code', 'SHOW_INACTIVE');
  END IF;
  
  -- Check user is registered for this show
  SELECT id INTO v_show_user FROM show_users 
  WHERE show_id = v_league.show_id AND user_id = v_user_id;
  
  IF v_show_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be registered for this show', 'error_code', 'NOT_REGISTERED');
  END IF;
  
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM league_members WHERE league_id = p_league_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member', 'error_code', 'ALREADY_MEMBER');
  END IF;
  
  -- Check max members
  IF v_league.max_members IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM league_members WHERE league_id = p_league_id) >= v_league.max_members THEN
      RETURN jsonb_build_object('success', false, 'error', 'League is full', 'error_code', 'LEAGUE_FULL');
    END IF;
  END IF;
  
  -- Join league
  INSERT INTO league_members (league_id, show_id, show_user_id, user_id)
  VALUES (p_league_id, v_league.show_id, v_show_user.id, v_user_id);
  
  RETURN jsonb_build_object('success', true, 'league_id', p_league_id, 'league_name', v_league.name);
END;
$$;

-- =============================================
-- 2.5 leave_league - Leave a league
-- =============================================
CREATE OR REPLACE FUNCTION public.leave_league(p_league_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_deleted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;
  
  DELETE FROM league_members 
  WHERE league_id = p_league_id AND user_id = v_user_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this league', 'error_code', 'NOT_MEMBER');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================
-- 2.6 get_leagues_with_stats - B2B admin view
-- =============================================
CREATE OR REPLACE FUNCTION public.get_leagues_with_stats(p_show_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  invite_code TEXT,
  is_public BOOLEAN,
  max_members INTEGER,
  member_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.description,
    l.invite_code,
    l.is_public,
    l.max_members,
    COUNT(lm.id)::BIGINT AS member_count,
    l.created_at
  FROM leagues l
  LEFT JOIN league_members lm ON lm.league_id = l.id
  WHERE l.show_id = p_show_id
  GROUP BY l.id
  ORDER BY l.created_at DESC;
END;
$$;

-- =============================================
-- 2.7 admin_get_user_team - Fetch user's team for admin view
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_get_user_team(
  p_show_id UUID,
  p_user_id UUID,
  p_episode_number INTEGER DEFAULT NULL
)
RETURNS TABLE(
  team_member_id UUID,
  participant_id UUID,
  participant_name TEXT,
  participant_photo_url TEXT,
  slot_position INTEGER,
  added_episode INTEGER,
  removed_episode INTEGER,
  total_points BIGINT,
  gameweek_points BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_episode_number INTEGER;
BEGIN
  -- Get current active episode
  SELECT e.episode_number INTO v_active_episode_number
  FROM episodes e
  WHERE e.show_id = p_show_id
    AND (e.is_active = true OR (e.active_from_datetime IS NOT NULL AND e.active_from_datetime <= now()))
  ORDER BY e.episode_number DESC
  LIMIT 1;

  RETURN QUERY
  WITH visible_episodes AS (
    SELECT ep.episode_number
    FROM episodes ep
    WHERE ep.show_id = p_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  participant_points AS (
    SELECT 
      ut.id AS team_member_id,
      ut.participant_id,
      ut.slot_position,
      ut.added_episode,
      ut.removed_episode,
      COALESCE(SUM(
        CASE 
          WHEN ve.episode_number IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points,
      COALESCE(SUM(
        CASE 
          WHEN ev.episode_number = v_active_episode_number
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS gameweek_points
    FROM user_teams ut
    LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = p_show_id
    LEFT JOIN visible_episodes ve ON ve.episode_number = ev.episode_number
    WHERE ut.show_id = p_show_id
      AND ut.user_id = p_user_id
      AND (p_episode_number IS NULL OR ut.removed_episode IS NULL OR ut.removed_episode > p_episode_number)
      AND (p_episode_number IS NULL OR ut.added_episode <= p_episode_number)
    GROUP BY ut.id, ut.participant_id, ut.slot_position, ut.added_episode, ut.removed_episode
  )
  SELECT 
    pp.team_member_id,
    pp.participant_id,
    p.name AS participant_name,
    p.photo_url AS participant_photo_url,
    pp.slot_position,
    pp.added_episode,
    pp.removed_episode,
    pp.total_points,
    pp.gameweek_points
  FROM participant_points pp
  JOIN participants p ON p.id = pp.participant_id
  WHERE pp.removed_episode IS NULL -- Only show current team by default
  ORDER BY pp.slot_position;
END;
$$;

-- =============================================
-- 2.8 admin_get_show_users_with_live_points - Live points for users list
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_get_show_users_with_live_points(p_show_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  gender TEXT,
  joined_at TIMESTAMPTZ,
  total_points BIGINT,
  gameweek_points BIGINT,
  team_size BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_episode_number INTEGER;
BEGIN
  -- Get current active episode
  SELECT e.episode_number INTO v_active_episode_number
  FROM episodes e
  WHERE e.show_id = p_show_id
    AND (e.is_active = true OR (e.active_from_datetime IS NOT NULL AND e.active_from_datetime <= now()))
  ORDER BY e.episode_number DESC
  LIMIT 1;

  RETURN QUERY
  WITH visible_episodes AS (
    SELECT ep.episode_number
    FROM episodes ep
    WHERE ep.show_id = p_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  user_points AS (
    SELECT 
      su.id AS show_user_id,
      su.user_id,
      COALESCE(SUM(
        CASE 
          WHEN ve.episode_number IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points,
      COALESCE(SUM(
        CASE 
          WHEN ev.episode_number = v_active_episode_number
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS gameweek_points
    FROM show_users su
    LEFT JOIN user_teams ut ON ut.user_id = su.user_id AND ut.show_id = p_show_id
    LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = p_show_id
    LEFT JOIN visible_episodes ve ON ve.episode_number = ev.episode_number
    WHERE su.show_id = p_show_id
    GROUP BY su.id, su.user_id
  ),
  user_team_size AS (
    SELECT 
      su.user_id AS uts_user_id,
      COUNT(ut.id)::BIGINT AS team_size
    FROM show_users su
    LEFT JOIN user_teams ut ON ut.user_id = su.user_id 
      AND ut.show_id = p_show_id 
      AND ut.removed_episode IS NULL
    WHERE su.show_id = p_show_id
    GROUP BY su.user_id
  )
  SELECT 
    su.id,
    su.user_id,
    su.username,
    su.email,
    su.avatar_url,
    su.gender,
    su.joined_at,
    COALESCE(up.total_points, 0)::BIGINT,
    COALESCE(up.gameweek_points, 0)::BIGINT,
    COALESCE(uts.team_size, 0)::BIGINT
  FROM show_users su
  LEFT JOIN user_points up ON up.show_user_id = su.id
  LEFT JOIN user_team_size uts ON uts.uts_user_id = su.user_id
  WHERE su.show_id = p_show_id
  ORDER BY up.total_points DESC NULLS LAST;
END;
$$;

-- =============================================
-- 2.9 get_participant_pick_counts - Dashboard ownership stats
-- =============================================
CREATE OR REPLACE FUNCTION public.get_participant_pick_counts(p_show_id UUID)
RETURNS TABLE(
  participant_id UUID,
  participant_name TEXT,
  participant_photo_url TEXT,
  pick_count BIGINT,
  pick_percentage NUMERIC,
  total_users BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users BIGINT;
BEGIN
  -- Get total users for this show
  SELECT COUNT(*) INTO v_total_users
  FROM show_users
  WHERE show_id = p_show_id;

  IF v_total_users = 0 THEN
    v_total_users := 1; -- Avoid division by zero
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS participant_id,
    p.name AS participant_name,
    p.photo_url AS participant_photo_url,
    COUNT(DISTINCT ut.user_id)::BIGINT AS pick_count,
    ROUND((COUNT(DISTINCT ut.user_id)::NUMERIC / v_total_users) * 100, 1) AS pick_percentage,
    v_total_users AS total_users
  FROM participants p
  LEFT JOIN user_teams ut ON ut.participant_id = p.id 
    AND ut.show_id = p_show_id 
    AND ut.removed_episode IS NULL
  WHERE p.show_id = p_show_id
    AND p.status = 'active'
  GROUP BY p.id, p.name, p.photo_url
  ORDER BY pick_count DESC;
END;
$$;