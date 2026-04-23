-- Create the missing get_user_leagues_with_stats function for B2C
CREATE OR REPLACE FUNCTION public.get_user_leagues_with_stats(p_show_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  invite_code text,
  is_public boolean,
  max_members integer,
  member_count bigint,
  user_rank bigint,
  leader_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_league_ids AS (
    SELECT lm.league_id
    FROM league_members lm
    WHERE lm.user_id = v_user_id
  ),
  league_stats AS (
    SELECT 
      l.id AS league_id,
      COUNT(lm.id)::BIGINT AS member_count
    FROM leagues l
    LEFT JOIN league_members lm ON lm.league_id = l.id
    WHERE l.show_id = p_show_id
      AND l.id IN (SELECT league_id FROM user_league_ids)
    GROUP BY l.id
  ),
  league_leaders AS (
    SELECT DISTINCT ON (lb.league_id)
      lb.league_id,
      lb.username AS leader_name,
      lb.total_points
    FROM (
      SELECT 
        lm.league_id,
        su.username,
        COALESCE(SUM(ep.points_awarded), 0)::BIGINT AS total_points
      FROM league_members lm
      JOIN show_users su ON su.id = lm.show_user_id
      LEFT JOIN user_teams ut ON ut.user_id = lm.user_id AND ut.show_id = p_show_id AND ut.removed_episode IS NULL
      LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
      LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = p_show_id
      LEFT JOIN episodes epi ON epi.show_id = ev.show_id AND epi.episode_number = ev.episode_number
        AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
      WHERE lm.league_id IN (SELECT league_id FROM user_league_ids)
      GROUP BY lm.league_id, lm.user_id, su.username
    ) lb
    ORDER BY lb.league_id, lb.total_points DESC
  ),
  user_ranks AS (
    SELECT 
      ranked.league_id,
      ranked.rank AS user_rank
    FROM (
      SELECT 
        lm.league_id,
        lm.user_id,
        RANK() OVER (PARTITION BY lm.league_id ORDER BY COALESCE(SUM(ep.points_awarded), 0) DESC)::BIGINT AS rank
      FROM league_members lm
      LEFT JOIN user_teams ut ON ut.user_id = lm.user_id AND ut.show_id = p_show_id AND ut.removed_episode IS NULL
      LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
      LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = p_show_id
      LEFT JOIN episodes epi ON epi.show_id = ev.show_id AND epi.episode_number = ev.episode_number
        AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
      WHERE lm.league_id IN (SELECT league_id FROM user_league_ids)
      GROUP BY lm.league_id, lm.user_id
    ) ranked
    WHERE ranked.user_id = v_user_id
  )
  SELECT 
    l.id,
    l.name,
    l.description,
    l.invite_code,
    l.is_public,
    l.max_members,
    COALESCE(ls.member_count, 0)::BIGINT,
    COALESCE(ur.user_rank, 1)::BIGINT,
    ll.leader_name,
    l.created_at
  FROM leagues l
  LEFT JOIN league_stats ls ON ls.league_id = l.id
  LEFT JOIN league_leaders ll ON ll.league_id = l.id
  LEFT JOIN user_ranks ur ON ur.league_id = l.id
  WHERE l.show_id = p_show_id
    AND l.id IN (SELECT league_id FROM user_league_ids)
  ORDER BY l.created_at DESC;
END;
$$;

-- Now grant execute permissions on ALL league RPC functions
GRANT EXECUTE ON FUNCTION public.create_league_with_membership(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_league_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_league_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_league(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_leagues_with_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leagues_with_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_league_leaderboard(uuid) TO authenticated;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_leagues_show_id ON public.leagues(show_id);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues(invite_code);
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON public.league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON public.league_members(user_id);

-- Ensure replica identity full for realtime
ALTER TABLE public.leagues REPLICA IDENTITY FULL;
ALTER TABLE public.league_members REPLICA IDENTITY FULL;