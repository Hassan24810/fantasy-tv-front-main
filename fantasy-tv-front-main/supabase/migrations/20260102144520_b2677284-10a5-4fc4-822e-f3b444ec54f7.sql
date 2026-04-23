-- Update create_event_with_participants to block inactive participants
CREATE OR REPLACE FUNCTION public.create_event_with_participants(p_show_id uuid, p_episode_number integer, p_rule_id uuid, p_participant_ids uuid[], p_event_date timestamp with time zone DEFAULT now(), p_notes text DEFAULT NULL::text, p_event_offset_minutes integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
  v_rule RECORD;
  v_points_array jsonb;
  v_points_raw jsonb;
  v_participant_id UUID;
  v_position INTEGER := 1;
  v_point_value INTEGER;
  v_total_points INTEGER := 0;
  v_user_id UUID := auth.uid();
  v_array_length INTEGER;
  v_inactive_participant TEXT;
BEGIN
  -- Verify user owns the show
  IF NOT EXISTS (
    SELECT 1 FROM shows WHERE id = p_show_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create events for this show', 'error_code', 'NOT_AUTHORIZED');
  END IF;

  -- Check for inactive participants
  SELECT name INTO v_inactive_participant
  FROM participants
  WHERE id = ANY(p_participant_ids) AND status = 'inactive'
  LIMIT 1;
  
  IF v_inactive_participant IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot create event for inactive participant: ' || v_inactive_participant, 'error_code', 'PARTICIPANT_INACTIVE');
  END IF;

  -- Get the rule
  SELECT * INTO v_rule FROM game_rules WHERE id = p_rule_id AND show_id = p_show_id;
  
  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid rule for this show', 'error_code', 'INVALID_RULE');
  END IF;

  -- Validate participants exist and belong to the show
  IF NOT (
    SELECT bool_and(EXISTS (SELECT 1 FROM participants WHERE id = pid AND show_id = p_show_id))
    FROM unnest(p_participant_ids) AS pid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or more participants are invalid', 'error_code', 'INVALID_PARTICIPANTS');
  END IF;

  -- Get points_per_position with type safety
  v_points_raw := v_rule.points_per_position;
  
  IF v_points_raw IS NOT NULL AND jsonb_typeof(v_points_raw) = 'string' THEN
    BEGIN
      v_points_array := (v_points_raw #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid points_per_position format in rule', 'error_code', 'INVALID_POINTS_FORMAT');
    END;
  ELSE
    v_points_array := COALESCE(v_points_raw, jsonb_build_array(v_rule.points));
  END IF;
  
  IF v_points_array IS NULL OR jsonb_typeof(v_points_array) != 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'points_per_position must be an array', 'error_code', 'INVALID_POINTS_FORMAT');
  END IF;

  v_array_length := jsonb_array_length(v_points_array);
  
  IF v_array_length = 0 THEN
    v_points_array := jsonb_build_array(v_rule.points);
    v_array_length := 1;
  END IF;

  -- Insert the main event record
  INSERT INTO events (show_id, episode_number, rule_id, participant_id, points_awarded, event_date, notes, event_offset_minutes)
  VALUES (
    p_show_id, 
    p_episode_number, 
    p_rule_id, 
    p_participant_ids[1],
    0,
    COALESCE(p_event_date, now()), 
    p_notes,
    COALESCE(p_event_offset_minutes, 0)
  )
  RETURNING id INTO v_event_id;

  -- Insert all participants with their position-based points
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    IF v_position <= v_array_length THEN
      v_point_value := (v_points_array->(v_position - 1))::integer;
    ELSE
      v_point_value := (v_points_array->(v_array_length - 1))::integer;
    END IF;
    
    v_total_points := v_total_points + v_point_value;
    
    INSERT INTO event_participants (event_id, participant_id, points_awarded, participant_position)
    VALUES (v_event_id, v_participant_id, v_point_value, v_position);
    
    v_position := v_position + 1;
  END LOOP;

  -- Update event with total points
  UPDATE events SET points_awarded = v_total_points WHERE id = v_event_id;

  -- Update episode event count
  UPDATE episodes 
  SET events_count = events_count + 1 
  WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'total_points', v_total_points);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'UNKNOWN_ERROR');
END;
$function$;

-- Update validate_and_execute_transfer to block inactive participants
CREATE OR REPLACE FUNCTION public.validate_and_execute_transfer(p_show_id uuid, p_participant_out_id uuid, p_participant_in_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_reset_period TEXT;
  v_transfers_this_period INTEGER;
  v_transfers_per_reset INTEGER;
  v_active_episode public.episodes;
  v_next_episode INTEGER;
  v_current_team UUID[];
  v_new_team UUID[];
  v_team_validation JSONB;
  v_settings public.game_settings;
  v_is_live BOOLEAN := false;
  v_now TIMESTAMPTZ := now();
  v_episode_end_time TIMESTAMPTZ;
  v_slot_position INTEGER;
  v_participant_status TEXT;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;

  -- Check if participant_in is inactive
  SELECT status INTO v_participant_status
  FROM participants
  WHERE id = p_participant_in_id AND show_id = p_show_id;
  
  IF v_participant_status = 'inactive' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This participant is inactive and cannot be selected', 'error_code', 'PARTICIPANT_INACTIVE');
  END IF;

  -- Get game settings
  SELECT * INTO v_settings FROM game_settings WHERE show_id = p_show_id;
  
  IF v_settings IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game settings not found', 'error_code', 'SETTINGS_NOT_FOUND');
  END IF;

  v_transfers_per_reset := v_settings.transfers_per_reset;

  -- Get active episode
  v_active_episode := public.get_current_active_episode(p_show_id);
  v_next_episode := COALESCE(v_active_episode.episode_number, 0) + 1;

  -- Check if locked during live
  IF v_settings.transfer_window_mode = 'locked_during_live' AND v_active_episode IS NOT NULL THEN
    IF v_active_episode.active_until_datetime IS NOT NULL THEN
      v_episode_end_time := v_active_episode.active_until_datetime;
    ELSIF v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.episode_duration_seconds IS NOT NULL THEN
      v_episode_end_time := v_active_episode.active_from_datetime + (v_active_episode.episode_duration_seconds || ' seconds')::interval;
    END IF;

    IF v_active_episode.is_active = true OR (v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.active_from_datetime <= v_now) THEN
      IF v_episode_end_time IS NULL OR v_now < v_episode_end_time THEN
        v_is_live := true;
      END IF;
    END IF;
    
    IF v_is_live THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transfers are locked during live episodes', 'error_code', 'LOCKED_DURING_LIVE');
    END IF;
  END IF;

  -- Get current reset period
  v_reset_period := public.get_current_reset_period(p_show_id);

  -- Count transfers in this period
  SELECT COUNT(*) INTO v_transfers_this_period
  FROM transfers
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND reset_period = v_reset_period;

  IF v_transfers_this_period >= v_transfers_per_reset THEN
    RETURN jsonb_build_object('success', false, 'error', 'No transfers remaining this period', 'error_code', 'NO_TRANSFERS_REMAINING');
  END IF;

  -- Check if participant_in is released
  IF NOT public.is_participant_released(p_participant_in_id, p_show_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This participant is not yet available for selection', 'error_code', 'NOT_RELEASED');
  END IF;

  -- Get current team (active members)
  SELECT array_agg(participant_id) INTO v_current_team
  FROM user_teams
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND removed_episode IS NULL;

  -- Validate participant_out is on team
  IF NOT (p_participant_out_id = ANY(v_current_team)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant not on your team', 'error_code', 'NOT_ON_TEAM');
  END IF;

  -- Validate participant_in is not already on team
  IF p_participant_in_id = ANY(v_current_team) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant already on your team', 'error_code', 'ALREADY_ON_TEAM');
  END IF;

  -- Build new team for validation
  v_new_team := array_remove(v_current_team, p_participant_out_id);
  v_new_team := array_append(v_new_team, p_participant_in_id);

  -- Validate team constraints
  v_team_validation := public.validate_team_constraints(p_show_id, v_new_team);
  
  IF NOT (v_team_validation->>'valid')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_team_validation->>'error', 'error_code', 'TEAM_INVALID');
  END IF;

  -- Get slot position from outgoing participant
  SELECT slot_position INTO v_slot_position
  FROM user_teams
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND participant_id = p_participant_out_id
    AND removed_episode IS NULL;

  -- Execute the transfer:
  -- 1. Mark outgoing participant as removed
  UPDATE user_teams
  SET removed_episode = v_next_episode, removed_at = now(), updated_at = now()
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND participant_id = p_participant_out_id
    AND removed_episode IS NULL;

  -- 2. Add incoming participant
  INSERT INTO user_teams (show_id, user_id, participant_id, slot_position, added_episode, added_at)
  VALUES (p_show_id, v_user_id, p_participant_in_id, COALESCE(v_slot_position, 1), v_next_episode, now());

  -- 3. Record the transfer with effective_from_episode
  INSERT INTO transfers (show_id, user_id, participant_out_id, participant_in_id, transfer_date, reset_period, effective_from_episode)
  VALUES (p_show_id, v_user_id, p_participant_out_id, p_participant_in_id, now(), v_reset_period, v_next_episode);

  RETURN jsonb_build_object(
    'success', true,
    'transfers_remaining', v_transfers_per_reset - v_transfers_this_period - 1,
    'effective_from_episode', v_next_episode
  );
END;
$function$;