-- Create RPC for live-calculated global ranking with membership-based points
CREATE OR REPLACE FUNCTION public.get_show_global_ranking(p_show_id UUID)
RETURNS TABLE(
  user_id UUID,
  show_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_episode public.episodes;
BEGIN
  -- Get current active episode for event reveal timing
  v_active_episode := public.get_current_active_episode(p_show_id);

  RETURN QUERY
  WITH visible_episodes AS (
    SELECT ep.episode_number, ep.active_from_datetime
    FROM episodes ep
    WHERE ep.show_id = p_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  revealed_events AS (
    SELECT e.id AS event_id, e.episode_number
    FROM events e
    JOIN visible_episodes ve ON ve.episode_number = e.episode_number
    WHERE e.show_id = p_show_id
      AND (
        ve.active_from_datetime IS NULL 
        OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
      )
  ),
  user_points AS (
    SELECT 
      su.user_id,
      su.id AS show_user_id,
      su.username,
      su.avatar_url,
      COALESCE(SUM(
        CASE 
          WHEN re.event_id IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points
    FROM show_users su
    LEFT JOIN user_teams ut ON ut.user_id = su.user_id AND ut.show_id = p_show_id
    LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = p_show_id
    LEFT JOIN revealed_events re ON re.event_id = ev.id
    WHERE su.show_id = p_show_id
    GROUP BY su.user_id, su.id, su.username, su.avatar_url
  )
  SELECT 
    up.user_id,
    up.show_user_id,
    up.username,
    up.avatar_url,
    up.total_points,
    RANK() OVER (ORDER BY up.total_points DESC)::BIGINT AS rank
  FROM user_points up
  ORDER BY up.total_points DESC;
END;
$$;