-- Update get_my_leagues_insights to include total_points
CREATE OR REPLACE FUNCTION public.get_my_leagues_insights(p_show_id uuid, p_last_gws integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'league_count', 0,
      'unique_member_count', 0,
      'total_points', 0,
      'most_owned', '[]'::jsonb,
      'most_transferred_in', '[]'::jsonb,
      'most_transferred_out', '[]'::jsonb
    );
  END IF;

  RETURN (
    WITH my_leagues AS (
      SELECT DISTINCT lm.league_id
      FROM league_members lm
      WHERE lm.user_id = v_user_id AND lm.show_id = p_show_id
    ),
    member_pool AS (
      SELECT DISTINCT lm.user_id
      FROM league_members lm
      JOIN my_leagues ml ON ml.league_id = lm.league_id
      WHERE lm.show_id = p_show_id
    ),
    visible_episodes AS (
      SELECT ep.episode_number, ep.active_from_datetime
      FROM episodes ep
      WHERE ep.show_id = p_show_id
        AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
    ),
    last_n_episodes AS (
      SELECT episode_number
      FROM visible_episodes
      ORDER BY episode_number DESC
      LIMIT p_last_gws
    ),
    -- Calculate total points for member pool
    member_total_points AS (
      SELECT COALESCE(SUM(ep.points_awarded), 0)::bigint AS total_points
      FROM user_teams ut
      JOIN member_pool mp ON mp.user_id = ut.user_id
      JOIN event_participants ep ON ep.participant_id = ut.participant_id
      JOIN events e ON e.id = ep.event_id AND e.show_id = p_show_id
      JOIN visible_episodes ve ON ve.episode_number = e.episode_number
      WHERE ut.show_id = p_show_id
        AND ut.added_episode <= e.episode_number
        AND (ut.removed_episode IS NULL OR ut.removed_episode > e.episode_number)
        AND (
          ve.active_from_datetime IS NULL 
          OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
        )
    ),
    participant_recent_points AS (
      SELECT 
        ep.participant_id,
        COALESCE(SUM(ep.points_awarded), 0)::integer AS last_gw_points
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      JOIN visible_episodes ve ON ve.episode_number = e.episode_number
      WHERE e.show_id = p_show_id
        AND e.episode_number IN (SELECT episode_number FROM last_n_episodes)
        AND (
          ve.active_from_datetime IS NULL 
          OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
        )
      GROUP BY ep.participant_id
    ),
    ownership_stats AS (
      SELECT 
        ut.participant_id,
        COUNT(DISTINCT ut.user_id)::integer AS owned_count
      FROM user_teams ut
      JOIN member_pool mp ON mp.user_id = ut.user_id
      WHERE ut.show_id = p_show_id
        AND ut.removed_episode IS NULL
      GROUP BY ut.participant_id
    ),
    most_owned AS (
      SELECT 
        p.id AS participant_id,
        p.name,
        p.photo_url,
        COALESCE(os.owned_count, 0) AS owned_count,
        (SELECT COUNT(*) FROM member_pool)::integer AS pool_size,
        ROUND((COALESCE(os.owned_count, 0)::numeric / GREATEST((SELECT COUNT(*) FROM member_pool), 1)) * 100, 1) AS owned_pct,
        COALESCE(prp.last_gw_points, 0) AS last_gw_points
      FROM participants p
      LEFT JOIN ownership_stats os ON os.participant_id = p.id
      LEFT JOIN participant_recent_points prp ON prp.participant_id = p.id
      WHERE p.show_id = p_show_id AND p.status = 'active'
      ORDER BY owned_count DESC, last_gw_points DESC
      LIMIT 6
    ),
    transfers_in AS (
      SELECT 
        t.participant_in_id AS participant_id,
        COUNT(*)::integer AS transfer_count
      FROM transfers t
      JOIN member_pool mp ON mp.user_id = t.user_id
      WHERE t.show_id = p_show_id
      GROUP BY t.participant_in_id
    ),
    most_transferred_in AS (
      SELECT 
        p.id AS participant_id,
        p.name,
        p.photo_url,
        COALESCE(ti.transfer_count, 0) AS transfer_count,
        COALESCE(prp.last_gw_points, 0) AS last_gw_points
      FROM participants p
      LEFT JOIN transfers_in ti ON ti.participant_id = p.id
      LEFT JOIN participant_recent_points prp ON prp.participant_id = p.id
      WHERE p.show_id = p_show_id AND p.status = 'active' AND COALESCE(ti.transfer_count, 0) > 0
      ORDER BY transfer_count DESC, last_gw_points DESC
      LIMIT 6
    ),
    transfers_out AS (
      SELECT 
        t.participant_out_id AS participant_id,
        COUNT(*)::integer AS transfer_count
      FROM transfers t
      JOIN member_pool mp ON mp.user_id = t.user_id
      WHERE t.show_id = p_show_id
      GROUP BY t.participant_out_id
    ),
    most_transferred_out AS (
      SELECT 
        p.id AS participant_id,
        p.name,
        p.photo_url,
        COALESCE(tou.transfer_count, 0) AS transfer_count,
        COALESCE(prp.last_gw_points, 0) AS last_gw_points
      FROM participants p
      LEFT JOIN transfers_out tou ON tou.participant_id = p.id
      LEFT JOIN participant_recent_points prp ON prp.participant_id = p.id
      WHERE p.show_id = p_show_id AND p.status = 'active' AND COALESCE(tou.transfer_count, 0) > 0
      ORDER BY transfer_count DESC, last_gw_points DESC
      LIMIT 6
    )
    SELECT jsonb_build_object(
      'league_count', (SELECT COUNT(*) FROM my_leagues),
      'unique_member_count', (SELECT COUNT(*) FROM member_pool),
      'total_points', (SELECT total_points FROM member_total_points),
      'most_owned', (SELECT COALESCE(jsonb_agg(row_to_json(mo)), '[]'::jsonb) FROM most_owned mo),
      'most_transferred_in', (SELECT COALESCE(jsonb_agg(row_to_json(mti)), '[]'::jsonb) FROM most_transferred_in mti),
      'most_transferred_out', (SELECT COALESCE(jsonb_agg(row_to_json(mto)), '[]'::jsonb) FROM most_transferred_out mto)
    )
  );
END;
$function$;

-- Update get_league_insights to include total_points
CREATE OR REPLACE FUNCTION public.get_league_insights(p_league_id uuid, p_last_gws integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_show_id UUID;
BEGIN
  SELECT l.show_id INTO v_show_id
  FROM leagues l WHERE l.id = p_league_id;

  IF v_show_id IS NULL THEN
    RETURN jsonb_build_object(
      'league_id', p_league_id,
      'league_member_count', 0,
      'total_points', 0,
      'most_owned', '[]'::jsonb,
      'most_transferred_in', '[]'::jsonb,
      'most_transferred_out', '[]'::jsonb
    );
  END IF;

  RETURN (
    WITH member_pool AS (
      SELECT DISTINCT lm.user_id
      FROM league_members lm
      WHERE lm.league_id = p_league_id
    ),
    visible_episodes AS (
      SELECT ep.episode_number, ep.active_from_datetime
      FROM episodes ep
      WHERE ep.show_id = v_show_id
        AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
    ),
    last_n_episodes AS (
      SELECT episode_number
      FROM visible_episodes
      ORDER BY episode_number DESC
      LIMIT p_last_gws
    ),
    -- Calculate total points for this league's member pool
    member_total_points AS (
      SELECT COALESCE(SUM(ep.points_awarded), 0)::bigint AS total_points
      FROM user_teams ut
      JOIN member_pool mp ON mp.user_id = ut.user_id
      JOIN event_participants ep ON ep.participant_id = ut.participant_id
      JOIN events e ON e.id = ep.event_id AND e.show_id = v_show_id
      JOIN visible_episodes ve ON ve.episode_number = e.episode_number
      WHERE ut.show_id = v_show_id
        AND ut.added_episode <= e.episode_number
        AND (ut.removed_episode IS NULL OR ut.removed_episode > e.episode_number)
        AND (
          ve.active_from_datetime IS NULL 
          OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
        )
    ),
    participant_recent_points AS (
      SELECT 
        ep.participant_id,
        COALESCE(SUM(ep.points_awarded), 0)::integer AS last_gw_points
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      JOIN visible_episodes ve ON ve.episode_number = e.episode_number
      WHERE e.show_id = v_show_id
        AND e.episode_number IN (SELECT episode_number FROM last_n_episodes)
        AND (
          ve.active_from_datetime IS NULL 
          OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
        )
      GROUP BY ep.participant_id
    ),
    ownership_stats AS (
      SELECT 
        ut.participant_id,
        COUNT(DISTINCT ut.user_id)::integer AS owned_count
      FROM user_teams ut
      JOIN member_pool mp ON mp.user_id = ut.user_id
      WHERE ut.show_id = v_show_id AND ut.removed_episode IS NULL
      GROUP BY ut.participant_id
    ),
    most_owned AS (
      SELECT 
        p.id AS participant_id,
        p.name,
        p.photo_url,
        COALESCE(os.owned_count, 0) AS owned_count,
        (SELECT COUNT(*) FROM member_pool)::integer AS pool_size,
        ROUND((COALESCE(os.owned_count, 0)::numeric / GREATEST((SELECT COUNT(*) FROM member_pool), 1)) * 100, 1) AS owned_pct,
        COALESCE(prp.last_gw_points, 0) AS last_gw_points
      FROM participants p
      LEFT JOIN ownership_stats os ON os.participant_id = p.id
      LEFT JOIN participant_recent_points prp ON prp.participant_id = p.id
      WHERE p.show_id = v_show_id AND p.status = 'active'
      ORDER BY owned_count DESC, last_gw_points DESC
      LIMIT 6
    ),
    transfers_in AS (
      SELECT t.participant_in_id AS participant_id, COUNT(*)::integer AS transfer_count
      FROM transfers t
      JOIN member_pool mp ON mp.user_id = t.user_id
      WHERE t.show_id = v_show_id
      GROUP BY t.participant_in_id
    ),
    most_transferred_in AS (
      SELECT 
        p.id AS participant_id, p.name, p.photo_url,
        COALESCE(ti.transfer_count, 0) AS transfer_count,
        COALESCE(prp.last_gw_points, 0) AS last_gw_points
      FROM participants p
      LEFT JOIN transfers_in ti ON ti.participant_id = p.id
      LEFT JOIN participant_recent_points prp ON prp.participant_id = p.id
      WHERE p.show_id = v_show_id AND p.status = 'active' AND COALESCE(ti.transfer_count, 0) > 0
      ORDER BY transfer_count DESC, last_gw_points DESC
      LIMIT 6
    ),
    transfers_out AS (
      SELECT t.participant_out_id AS participant_id, COUNT(*)::integer AS transfer_count
      FROM transfers t
      JOIN member_pool mp ON mp.user_id = t.user_id
      WHERE t.show_id = v_show_id
      GROUP BY t.participant_out_id
    ),
    most_transferred_out AS (
      SELECT 
        p.id AS participant_id, p.name, p.photo_url,
        COALESCE(tou.transfer_count, 0) AS transfer_count,
        COALESCE(prp.last_gw_points, 0) AS last_gw_points
      FROM participants p
      LEFT JOIN transfers_out tou ON tou.participant_id = p.id
      LEFT JOIN participant_recent_points prp ON prp.participant_id = p.id
      WHERE p.show_id = v_show_id AND p.status = 'active' AND COALESCE(tou.transfer_count, 0) > 0
      ORDER BY transfer_count DESC, last_gw_points DESC
      LIMIT 6
    )
    SELECT jsonb_build_object(
      'league_id', p_league_id,
      'league_member_count', (SELECT COUNT(*) FROM member_pool),
      'total_points', (SELECT total_points FROM member_total_points),
      'most_owned', (SELECT COALESCE(jsonb_agg(row_to_json(mo)), '[]'::jsonb) FROM most_owned mo),
      'most_transferred_in', (SELECT COALESCE(jsonb_agg(row_to_json(mti)), '[]'::jsonb) FROM most_transferred_in mti),
      'most_transferred_out', (SELECT COALESCE(jsonb_agg(row_to_json(mto)), '[]'::jsonb) FROM most_transferred_out mto)
    )
  );
END;
$function$;