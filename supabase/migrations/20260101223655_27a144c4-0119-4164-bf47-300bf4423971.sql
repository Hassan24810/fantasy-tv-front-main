-- RPC 1: Get participant event counts
CREATE OR REPLACE FUNCTION public.get_participant_event_counts(
  p_show_id uuid, 
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  participant_id uuid,
  name text,
  photo_url text,
  event_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS participant_id,
    p.name,
    p.photo_url,
    COUNT(ep.id)::BIGINT AS event_count
  FROM participants p
  JOIN event_participants ep ON ep.participant_id = p.id
  JOIN events e ON e.id = ep.event_id AND e.show_id = p_show_id
  WHERE p.show_id = p_show_id
    AND p.status = 'active'
  GROUP BY p.id, p.name, p.photo_url
  ORDER BY event_count DESC
  LIMIT p_limit;
END;
$$;

-- RPC 2: Get user points comparison (live calculated)
CREATE OR REPLACE FUNCTION public.get_user_points_comparison(p_show_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  gameweek_points bigint,
  total_points bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_episode_number INTEGER;
BEGIN
  -- Get latest visible episode number
  SELECT episode_number INTO v_active_episode_number
  FROM episodes
  WHERE show_id = p_show_id
    AND (is_active = true OR (active_from_datetime IS NOT NULL AND active_from_datetime <= now()))
  ORDER BY episode_number DESC
  LIMIT 1;

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
  user_points_calc AS (
    SELECT 
      su.user_id,
      su.username,
      su.avatar_url,
      COALESCE(SUM(
        CASE 
          WHEN re.event_id IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN epart.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points,
      COALESCE(SUM(
        CASE 
          WHEN ev.episode_number = v_active_episode_number
               AND re.event_id IS NOT NULL
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN epart.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS gameweek_points
    FROM show_users su
    LEFT JOIN user_teams ut ON ut.user_id = su.user_id AND ut.show_id = p_show_id
    LEFT JOIN event_participants epart ON epart.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = epart.event_id AND ev.show_id = p_show_id
    LEFT JOIN revealed_events re ON re.event_id = ev.id
    WHERE su.show_id = p_show_id
    GROUP BY su.user_id, su.username, su.avatar_url
  )
  SELECT 
    upc.user_id,
    upc.username,
    upc.avatar_url,
    upc.gameweek_points,
    upc.total_points
  FROM user_points_calc upc
  ORDER BY upc.total_points DESC
  LIMIT 10;
END;
$$;