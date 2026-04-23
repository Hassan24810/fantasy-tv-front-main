-- Create RPC: get_my_leagues_insights (overview mode)
CREATE OR REPLACE FUNCTION public.get_my_leagues_insights(p_show_id uuid, p_last_gws integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_league_count INTEGER;
  v_unique_member_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'league_count', 0,
      'unique_member_count', 0,
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
    last_n_episodes AS (
      SELECT episode_number
      FROM episodes
      WHERE show_id = p_show_id
        AND (is_active = true OR (active_from_datetime IS NOT NULL AND active_from_datetime <= now()))
      ORDER BY episode_number DESC
      LIMIT p_last_gws
    ),
    participant_recent_points AS (
      SELECT 
        ep.participant_id,
        COALESCE(SUM(ep.points_awarded), 0)::integer AS last_gw_points
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      JOIN episodes epi ON epi.show_id = e.show_id AND epi.episode_number = e.episode_number
      WHERE e.show_id = p_show_id
        AND e.episode_number IN (SELECT episode_number FROM last_n_episodes)
        AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
        AND (
          epi.active_from_datetime IS NULL 
          OR epi.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
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
      'most_owned', (SELECT COALESCE(jsonb_agg(row_to_json(mo)), '[]'::jsonb) FROM most_owned mo),
      'most_transferred_in', (SELECT COALESCE(jsonb_agg(row_to_json(mti)), '[]'::jsonb) FROM most_transferred_in mti),
      'most_transferred_out', (SELECT COALESCE(jsonb_agg(row_to_json(mto)), '[]'::jsonb) FROM most_transferred_out mto)
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_leagues_insights(uuid, integer) TO authenticated;

-- Create RPC: get_league_insights (single league mode)
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
    last_n_episodes AS (
      SELECT episode_number
      FROM episodes
      WHERE show_id = v_show_id
        AND (is_active = true OR (active_from_datetime IS NOT NULL AND active_from_datetime <= now()))
      ORDER BY episode_number DESC
      LIMIT p_last_gws
    ),
    participant_recent_points AS (
      SELECT 
        ep.participant_id,
        COALESCE(SUM(ep.points_awarded), 0)::integer AS last_gw_points
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      JOIN episodes epi ON epi.show_id = e.show_id AND epi.episode_number = e.episode_number
      WHERE e.show_id = v_show_id
        AND e.episode_number IN (SELECT episode_number FROM last_n_episodes)
        AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
        AND (
          epi.active_from_datetime IS NULL 
          OR epi.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
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
      'most_owned', (SELECT COALESCE(jsonb_agg(row_to_json(mo)), '[]'::jsonb) FROM most_owned mo),
      'most_transferred_in', (SELECT COALESCE(jsonb_agg(row_to_json(mti)), '[]'::jsonb) FROM most_transferred_in mti),
      'most_transferred_out', (SELECT COALESCE(jsonb_agg(row_to_json(mto)), '[]'::jsonb) FROM most_transferred_out mto)
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_league_insights(uuid, integer) TO authenticated;