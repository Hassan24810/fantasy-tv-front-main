-- RPC: get_my_team_events_all_episodes
-- Returns per-episode team members + filtered events using EXACT same logic as get_user_points_breakdown
-- Uses SECURITY DEFINER and auth.uid() (no client-provided user_id)

CREATE OR REPLACE FUNCTION public.get_my_team_events_all_episodes(p_show_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN (
    WITH visible_episodes AS (
      -- Same visibility logic as get_user_points_breakdown
      SELECT ep.id, ep.episode_number, ep.episode_name, ep.active_from_datetime
      FROM episodes ep
      WHERE ep.show_id = p_show_id
        AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
    ),
    user_team_membership AS (
      -- Get all team intervals for this user/show
      SELECT ut.participant_id, ut.added_episode, ut.removed_episode, ut.slot_position
      FROM user_teams ut
      WHERE ut.show_id = p_show_id AND ut.user_id = v_user_id
    ),
    team_per_episode AS (
      -- Build team array per episode using interval conditions
      SELECT 
        ve.episode_number,
        jsonb_agg(
          jsonb_build_object(
            'participant_id', utm.participant_id,
            'name', p.name,
            'photo_url', p.photo_url,
            'slot_position', utm.slot_position
          ) ORDER BY utm.slot_position
        ) AS team_members
      FROM visible_episodes ve
      CROSS JOIN user_team_membership utm
      JOIN participants p ON p.id = utm.participant_id
      WHERE utm.added_episode <= ve.episode_number
        AND (utm.removed_episode IS NULL OR utm.removed_episode > ve.episode_number)
      GROUP BY ve.episode_number
    ),
    revealed_events AS (
      -- Same reveal logic as get_user_points_breakdown
      SELECT e.id AS event_id, e.episode_number, e.event_offset_minutes, e.rule_id, e.notes
      FROM events e
      JOIN visible_episodes ve ON ve.episode_number = e.episode_number
      WHERE e.show_id = p_show_id
        AND (
          ve.active_from_datetime IS NULL 
          OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
        )
    ),
    events_with_points AS (
      SELECT 
        re.event_id,
        re.episode_number,
        re.event_offset_minutes,
        re.rule_id,
        gr.event_name AS rule_name,
        gr.icon AS rule_icon,
        gr.template AS rule_template,
        re.notes,
        -- CRITICAL: Join with interval conditions to avoid duplicates
        COALESCE(SUM(
          CASE 
            WHEN utm.participant_id IS NOT NULL 
                 AND utm.added_episode <= re.episode_number 
                 AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
            THEN ep.points_awarded 
            ELSE 0 
          END
        ), 0) AS user_points_earned,
        jsonb_agg(
          jsonb_build_object(
            'participant_id', ep.participant_id,
            'name', p.name,
            'photo_url', p.photo_url,
            'points', ep.points_awarded,
            'position', ep.participant_position,
            'is_on_team', (
              utm.participant_id IS NOT NULL 
              AND utm.added_episode <= re.episode_number 
              AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
            )
          ) ORDER BY ep.participant_position
        ) AS all_participants
      FROM revealed_events re
      JOIN game_rules gr ON gr.id = re.rule_id
      JOIN event_participants ep ON ep.event_id = re.event_id
      JOIN participants p ON p.id = ep.participant_id
      -- CRITICAL: Join with episode interval conditions to prevent duplicates
      LEFT JOIN user_team_membership utm 
        ON utm.participant_id = ep.participant_id
       AND utm.added_episode <= re.episode_number
       AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
      GROUP BY re.event_id, re.episode_number, re.event_offset_minutes, re.rule_id, 
               gr.event_name, gr.icon, gr.template, re.notes
      -- Only include events where user earned points (positive or negative)
      HAVING COALESCE(SUM(
        CASE 
          WHEN utm.participant_id IS NOT NULL 
               AND utm.added_episode <= re.episode_number 
               AND (utm.removed_episode IS NULL OR utm.removed_episode > re.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0) != 0
    ),
    events_grouped AS (
      SELECT 
        episode_number,
        jsonb_agg(
          jsonb_build_object(
            'event_id', event_id,
            'event_offset_minutes', event_offset_minutes,
            'rule_id', rule_id,
            'rule_name', rule_name,
            'rule_icon', rule_icon,
            'rule_template', rule_template,
            'notes', notes,
            'user_points_earned', user_points_earned,
            'all_participants', all_participants
          ) ORDER BY event_offset_minutes
        ) AS events
      FROM events_with_points
      GROUP BY episode_number
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'episode_number', ve.episode_number,
        'episode_id', ve.id,
        'episode_name', ve.episode_name,
        'team_members', COALESCE(tpe.team_members, '[]'::jsonb),
        'events', COALESCE(eg.events, '[]'::jsonb)
      ) ORDER BY ve.episode_number DESC
    ), '[]'::jsonb)
    FROM visible_episodes ve
    LEFT JOIN team_per_episode tpe ON tpe.episode_number = ve.episode_number
    LEFT JOIN events_grouped eg ON eg.episode_number = ve.episode_number
  );
END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_team_events_all_episodes(uuid) TO authenticated;

-- Add/verify indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_show_episode ON events(show_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_participant ON event_participants(event_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_show_user_intervals ON user_teams(show_id, user_id, participant_id, added_episode, removed_episode);