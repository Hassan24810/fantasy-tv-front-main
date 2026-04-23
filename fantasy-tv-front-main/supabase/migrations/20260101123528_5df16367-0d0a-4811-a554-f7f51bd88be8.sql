-- RPC: Get user's team for a specific episode using interval logic
CREATE OR REPLACE FUNCTION public.get_user_team_for_episode(
  p_show_id uuid, 
  p_episode_number integer
)
RETURNS TABLE(
  participant_id uuid,
  participant_name text,
  photo_url text,
  slot_position integer,
  added_episode integer,
  removed_episode integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ut.participant_id,
    p.name AS participant_name,
    p.photo_url,
    ut.slot_position,
    ut.added_episode,
    ut.removed_episode
  FROM user_teams ut
  JOIN participants p ON p.id = ut.participant_id
  WHERE ut.show_id = p_show_id
    AND ut.user_id = v_user_id
    AND ut.added_episode <= p_episode_number
    AND (ut.removed_episode IS NULL OR ut.removed_episode > p_episode_number)
  ORDER BY ut.slot_position;
END;
$$;

-- RPC: Get episode events with optional team filtering
CREATE OR REPLACE FUNCTION public.get_episode_events_filtered(
  p_show_id uuid,
  p_episode_number integer,
  p_only_my_team boolean DEFAULT false
)
RETURNS TABLE(
  event_id uuid,
  event_offset_minutes integer,
  rule_id uuid,
  rule_name text,
  rule_icon text,
  rule_template text,
  notes text,
  participants jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_episode_start TIMESTAMPTZ;
BEGIN
  -- Get episode start time for reveal check
  SELECT active_from_datetime INTO v_episode_start
  FROM episodes
  WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN QUERY
  WITH user_team_for_episode AS (
    SELECT ut.participant_id
    FROM user_teams ut
    WHERE ut.show_id = p_show_id
      AND ut.user_id = v_user_id
      AND ut.added_episode <= p_episode_number
      AND (ut.removed_episode IS NULL OR ut.removed_episode > p_episode_number)
  ),
  event_data AS (
    SELECT 
      e.id AS event_id,
      COALESCE(e.event_offset_minutes, 0) AS event_offset_minutes,
      e.rule_id,
      gr.event_name AS rule_name,
      gr.icon AS rule_icon,
      gr.template AS rule_template,
      e.notes,
      jsonb_agg(
        jsonb_build_object(
          'participant_id', ep.participant_id,
          'name', p.name,
          'photo_url', p.photo_url,
          'points', ep.points_awarded,
          'position', ep.participant_position,
          'is_on_team', EXISTS (SELECT 1 FROM user_team_for_episode utt WHERE utt.participant_id = ep.participant_id)
        ) ORDER BY ep.participant_position
      ) AS participants,
      bool_or(EXISTS (SELECT 1 FROM user_team_for_episode utt WHERE utt.participant_id = ep.participant_id)) AS has_team_participant
    FROM events e
    JOIN game_rules gr ON gr.id = e.rule_id
    JOIN event_participants ep ON ep.event_id = e.id
    JOIN participants p ON p.id = ep.participant_id
    WHERE e.show_id = p_show_id
      AND e.episode_number = p_episode_number
      -- Event reveal check
      AND (
        v_episode_start IS NULL 
        OR v_episode_start + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
      )
    GROUP BY e.id, e.event_offset_minutes, e.rule_id, gr.event_name, gr.icon, gr.template, e.notes
  )
  SELECT 
    ed.event_id,
    ed.event_offset_minutes,
    ed.rule_id,
    ed.rule_name,
    ed.rule_icon,
    ed.rule_template,
    ed.notes,
    ed.participants
  FROM event_data ed
  WHERE (p_only_my_team = false OR ed.has_team_participant = true)
  ORDER BY ed.event_offset_minutes;
END;
$$;