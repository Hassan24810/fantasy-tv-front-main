-- Drop and recreate get_episode_events_filtered with new return type
DROP FUNCTION IF EXISTS public.get_episode_events_filtered(uuid, integer, boolean);

CREATE OR REPLACE FUNCTION public.get_episode_events_filtered(p_show_id uuid, p_episode_number integer, p_only_my_team boolean DEFAULT false)
 RETURNS TABLE(event_id uuid, event_offset_minutes integer, event_offset_seconds integer, rule_id uuid, rule_name text, rule_icon text, rule_template text, notes text, participants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_episode_start TIMESTAMPTZ;
BEGIN
  SELECT active_from_datetime INTO v_episode_start FROM episodes WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN QUERY
  WITH user_team_for_episode AS (
    SELECT ut.participant_id FROM user_teams ut
    WHERE ut.show_id = p_show_id AND ut.user_id = v_user_id AND ut.added_episode <= p_episode_number
      AND (ut.removed_episode IS NULL OR ut.removed_episode > p_episode_number)
  ),
  event_data AS (
    SELECT e.id AS event_id, COALESCE(e.event_offset_minutes, 0) AS event_offset_minutes,
      COALESCE(e.event_offset_seconds, COALESCE(e.event_offset_minutes, 0) * 60) AS event_offset_seconds,
      e.rule_id, gr.event_name AS rule_name, gr.icon AS rule_icon, gr.template AS rule_template, e.notes,
      jsonb_agg(jsonb_build_object('participant_id', ep.participant_id, 'name', p.name, 'photo_url', p.photo_url, 'points', ep.points_awarded, 'position', ep.participant_position, 'is_on_team', EXISTS (SELECT 1 FROM user_team_for_episode utt WHERE utt.participant_id = ep.participant_id)) ORDER BY ep.participant_position) AS participants,
      bool_or(EXISTS (SELECT 1 FROM user_team_for_episode utt WHERE utt.participant_id = ep.participant_id)) AS has_team_participant
    FROM events e JOIN game_rules gr ON gr.id = e.rule_id JOIN event_participants ep ON ep.event_id = e.id JOIN participants p ON p.id = ep.participant_id
    WHERE e.show_id = p_show_id AND e.episode_number = p_episode_number
      AND (v_episode_start IS NULL OR v_episode_start + (COALESCE(e.event_offset_seconds, COALESCE(e.event_offset_minutes, 0) * 60) || ' seconds')::interval <= now())
    GROUP BY e.id, e.event_offset_minutes, e.event_offset_seconds, e.rule_id, gr.event_name, gr.icon, gr.template, e.notes
  )
  SELECT ed.event_id, ed.event_offset_minutes, ed.event_offset_seconds, ed.rule_id, ed.rule_name, ed.rule_icon, ed.rule_template, ed.notes, ed.participants
  FROM event_data ed WHERE (p_only_my_team = false OR ed.has_team_participant = true) ORDER BY ed.event_offset_seconds;
END;
$function$;