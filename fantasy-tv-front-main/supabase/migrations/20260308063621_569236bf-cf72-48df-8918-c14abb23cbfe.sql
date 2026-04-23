CREATE OR REPLACE FUNCTION public.get_user_points_breakdown(p_show_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_active_episode public.episodes;
  v_active_episode_number INTEGER;
  v_total_points BIGINT := 0;
  v_gameweek_points BIGINT := 0;
  v_events jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'total_points', 0,
      'gameweek_points', 0,
      'gameweek_episode_number', NULL,
      'events', '[]'::jsonb
    );
  END IF;

  -- Get current active episode (same logic as calculate_user_gameweek_points)
  v_active_episode := public.get_current_active_episode(p_show_id);
  v_active_episode_number := v_active_episode.episode_number;

  -- Build events array with points breakdown
  -- Uses same visibility + reveal logic as calculate_user_total_points
  WITH visible_episodes AS (
    SELECT ep.episode_number, ep.active_from_datetime
    FROM episodes ep
    WHERE ep.show_id = p_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  revealed_events AS (
    SELECT e.id AS event_id, e.episode_number, e.event_offset_minutes, e.rule_id
    FROM events e
    JOIN visible_episodes ve ON ve.episode_number = e.episode_number
    WHERE e.show_id = p_show_id
      AND (
        ve.active_from_datetime IS NULL
        OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
      )
  ),
  user_team_membership AS (
    -- For each user_teams row, determine which episodes it covers
    SELECT
      ut.participant_id,
      ut.added_episode,
      ut.removed_episode
    FROM user_teams ut
    WHERE ut.show_id = p_show_id
      AND ut.user_id = v_user_id
  ),
  event_with_user_points AS (
    SELECT
      re.event_id,
      re.episode_number,
      re.event_offset_minutes,
      re.rule_id,
      gr.event_name AS rule_name,
      gr.icon AS rule_icon,
      gr.template AS rule_template,
      COALESCE(SUM(
        CASE
          WHEN utm.participant_id IS NOT NULL
               AND utm.added_episode <= re.episode_number
               AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
          THEN ep.points_awarded
          ELSE 0
        END
      ), 0) AS event_points_earned,
      BOOL_OR(
        utm.participant_id IS NOT NULL
        AND utm.added_episode <= re.episode_number
        AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
      ) AS has_team_participant,
      jsonb_agg(
        CASE
          WHEN utm.participant_id IS NOT NULL
               AND utm.added_episode <= re.episode_number
               AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
          THEN jsonb_build_object(
            'participant_id', ep.participant_id,
            'participant_name', p.name,
            'points_awarded', ep.points_awarded,
            'position', ep.participant_position
          )
          ELSE NULL
        END
      ) FILTER (WHERE utm.participant_id IS NOT NULL
               AND utm.added_episode <= re.episode_number
               AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)) AS contributing_participants,
      jsonb_agg(
        jsonb_build_object(
          'participant_id', ep.participant_id,
          'participant_name', p.name,
          'points_awarded', ep.points_awarded,
          'position', ep.participant_position
        ) ORDER BY ep.participant_position
      ) AS all_event_participants
    FROM revealed_events re
    JOIN game_rules gr ON gr.id = re.rule_id
    JOIN event_participants ep ON ep.event_id = re.event_id
    JOIN participants p ON p.id = ep.participant_id
    LEFT JOIN user_team_membership utm ON utm.participant_id = ep.participant_id
    GROUP BY re.event_id, re.episode_number, re.event_offset_minutes, re.rule_id, gr.event_name, gr.icon, gr.template
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'event_id', event_id,
        'episode_number', episode_number,
        'event_offset_minutes', event_offset_minutes,
        'rule_id', rule_id,
        'rule_name', rule_name,
        'rule_icon', rule_icon,
        'rule_template', rule_template,
        'event_points_earned', event_points_earned,
        'contributing_participants', COALESCE(contributing_participants, '[]'::jsonb),
        'all_event_participants', all_event_participants
      ) ORDER BY episode_number, event_offset_minutes
    ), '[]'::jsonb)
  INTO v_events
  FROM event_with_user_points
  WHERE has_team_participant = true;

  -- Calculate total points (sum of all event_points_earned)
  SELECT COALESCE(SUM((e->>'event_points_earned')::bigint), 0)
  INTO v_total_points
  FROM jsonb_array_elements(v_events) AS e;

  -- Calculate gameweek points (sum for current episode only)
  SELECT COALESCE(SUM((e->>'event_points_earned')::bigint), 0)
  INTO v_gameweek_points
  FROM jsonb_array_elements(v_events) AS e
  WHERE (e->>'episode_number')::integer = v_active_episode_number;

  RETURN jsonb_build_object(
    'total_points', v_total_points,
    'gameweek_points', v_gameweek_points,
    'gameweek_episode_number', v_active_episode_number,
    'events', v_events
  );
END;
$function$;