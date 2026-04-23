-- Update validate_and_execute_transfer to use next episode for transfers
-- This ensures transferred participants only earn points from the NEXT episode onwards

CREATE OR REPLACE FUNCTION public.validate_and_execute_transfer(p_show_id uuid, p_participant_out_id uuid, p_participant_in_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer_status JSONB;
  v_active_episode public.episodes;
  v_reset_period TEXT;
  v_current_team UUID[];
  v_new_team UUID[];
  v_team_validation JSONB;
  v_out_team_record public.user_teams;
  v_next_episode INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'next_allowed_datetime', null
    );
  END IF;

  -- NEW: Check if participant_in is released
  IF NOT public.is_participant_released(p_participant_in_id, p_show_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This participant is not yet available for selection',
      'next_allowed_datetime', null
    );
  END IF;

  -- Check if transfer is allowed
  v_transfer_status := public.get_next_transfer_time(p_show_id);
  
  IF NOT (v_transfer_status->>'can_transfer')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_transfer_status->>'reason',
      'next_allowed_datetime', v_transfer_status->>'next_allowed_datetime',
      'transfers_remaining', (v_transfer_status->>'transfers_remaining')::integer
    );
  END IF;

  -- Get current team
  SELECT array_agg(participant_id) INTO v_current_team
  FROM public.user_teams
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND removed_episode IS NULL;

  -- Check if participant_out is on team
  IF NOT (p_participant_out_id = ANY(v_current_team)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Participant not on your team',
      'next_allowed_datetime', null
    );
  END IF;

  -- Check if participant_in is already on team
  IF p_participant_in_id = ANY(v_current_team) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Participant already on your team',
      'next_allowed_datetime', null
    );
  END IF;

  -- Build new team for validation
  v_new_team := array_remove(v_current_team, p_participant_out_id);
  v_new_team := array_append(v_new_team, p_participant_in_id);

  -- Validate team constraints
  v_team_validation := public.validate_team_constraints(p_show_id, v_new_team);
  
  IF NOT (v_team_validation->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_team_validation->>'error',
      'next_allowed_datetime', null
    );
  END IF;

  -- Get active episode and reset period
  v_active_episode := public.get_current_active_episode(p_show_id);
  v_reset_period := public.get_current_reset_period(p_show_id);
  
  -- Calculate next episode number for transfer to take effect
  -- Transfers take effect from the NEXT episode, not the current one
  v_next_episode := COALESCE(v_active_episode.episode_number, 0) + 1;

  -- Execute transfer: mark old participant as removed FROM NEXT EPISODE
  -- This means outgoing participant keeps earning points for current episode
  UPDATE public.user_teams
  SET removed_episode = v_next_episode,
      removed_at = now(),
      updated_at = now()
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND participant_id = p_participant_out_id
    AND removed_episode IS NULL
  RETURNING * INTO v_out_team_record;

  -- Add new participant FROM NEXT EPISODE
  -- This means incoming participant only earns points from next episode onwards
  INSERT INTO public.user_teams (show_id, user_id, participant_id, slot_position, added_episode, added_at)
  VALUES (
    p_show_id,
    v_user_id,
    p_participant_in_id,
    COALESCE(v_out_team_record.slot_position, 1),
    v_next_episode,
    now()
  );

  -- Record transfer
  INSERT INTO public.transfers (show_id, user_id, participant_out_id, participant_in_id, transfer_date, reset_period)
  VALUES (p_show_id, v_user_id, p_participant_out_id, p_participant_in_id, now(), v_reset_period);

  -- Get updated transfer count
  v_transfer_status := public.get_next_transfer_time(p_show_id);

  RETURN jsonb_build_object(
    'success', true,
    'transfers_remaining', (v_transfer_status->>'transfers_remaining')::integer,
    'effective_from_episode', v_next_episode
  );
END;
$function$;