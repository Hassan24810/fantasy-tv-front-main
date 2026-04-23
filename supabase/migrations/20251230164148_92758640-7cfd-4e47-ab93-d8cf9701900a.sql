-- Create RPC for atomic event creation with participants
CREATE OR REPLACE FUNCTION public.create_event_with_participants(
  p_show_id UUID,
  p_episode_number INTEGER,
  p_rule_id UUID,
  p_participant_ids UUID[],
  p_event_date TIMESTAMPTZ DEFAULT now(),
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id UUID;
  v_points INTEGER;
  v_participant_id UUID;
  v_position INTEGER := 1;
  v_user_id UUID := auth.uid();
BEGIN
  -- Verify user owns the show
  IF NOT EXISTS (
    SELECT 1 FROM shows WHERE id = p_show_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create events for this show');
  END IF;

  -- Get points from rule
  SELECT points INTO v_points FROM game_rules WHERE id = p_rule_id AND show_id = p_show_id;
  
  IF v_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid rule for this show');
  END IF;

  -- Validate participants exist and belong to the show
  IF NOT (
    SELECT bool_and(EXISTS (SELECT 1 FROM participants WHERE id = pid AND show_id = p_show_id))
    FROM unnest(p_participant_ids) AS pid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or more participants are invalid');
  END IF;

  -- Insert event (participant_id stores first participant for backward compatibility)
  INSERT INTO events (show_id, episode_number, rule_id, participant_id, points_awarded, event_date, notes)
  VALUES (
    p_show_id, 
    p_episode_number, 
    p_rule_id, 
    p_participant_ids[1], 
    v_points * array_length(p_participant_ids, 1), 
    COALESCE(p_event_date, now()), 
    p_notes
  )
  RETURNING id INTO v_event_id;

  -- Insert all participants atomically
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    INSERT INTO event_participants (event_id, participant_id, points_awarded, participant_position)
    VALUES (v_event_id, v_participant_id, v_points, v_position);
    v_position := v_position + 1;
  END LOOP;

  -- Update episode event count
  UPDATE episodes 
  SET events_count = events_count + 1 
  WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;