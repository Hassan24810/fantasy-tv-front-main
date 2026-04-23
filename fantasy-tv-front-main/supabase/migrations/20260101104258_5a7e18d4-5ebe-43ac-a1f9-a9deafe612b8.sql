-- Add effective_from_episode column to transfers table
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS effective_from_episode INTEGER;

-- Backfill existing data: derive from user_teams entries
UPDATE transfers t
SET effective_from_episode = (
  SELECT ut.added_episode 
  FROM user_teams ut 
  WHERE ut.show_id = t.show_id 
    AND ut.user_id = t.user_id 
    AND ut.participant_id = t.participant_in_id
    AND ut.added_at >= t.transfer_date - interval '5 seconds'
    AND ut.added_at <= t.transfer_date + interval '5 seconds'
  LIMIT 1
)
WHERE t.effective_from_episode IS NULL;

-- For any remaining nulls, calculate from episodes
UPDATE transfers t
SET effective_from_episode = COALESCE(t.effective_from_episode, (
  SELECT COALESCE(MAX(e.episode_number), 0) + 1
  FROM episodes e
  WHERE e.show_id = t.show_id
    AND (e.is_active = true OR (e.active_from_datetime IS NOT NULL AND e.active_from_datetime <= t.transfer_date))
))
WHERE t.effective_from_episode IS NULL;

-- Update validate_and_execute_transfer to store effective_from_episode on insert
CREATE OR REPLACE FUNCTION public.validate_and_execute_transfer(
  p_show_id uuid,
  p_participant_out_id uuid,
  p_participant_in_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
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
$$;

-- Create delete_transfer_in_current_round RPC
CREATE OR REPLACE FUNCTION public.delete_transfer_in_current_round(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer RECORD;
  v_current_reset_period TEXT;
  v_active_episode public.episodes;
  v_current_episode_number INTEGER;
  v_transfer_status JSONB;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;

  -- Get the transfer with participant names
  SELECT t.*, p_out.name as out_name, p_in.name as in_name
  INTO v_transfer 
  FROM transfers t
  JOIN participants p_out ON p_out.id = t.participant_out_id
  JOIN participants p_in ON p_in.id = t.participant_in_id
  WHERE t.id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer not found', 'error_code', 'NOT_FOUND');
  END IF;

  -- Ownership check
  IF v_transfer.user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized', 'error_code', 'NOT_AUTHORIZED');
  END IF;

  -- Get current reset period
  v_current_reset_period := public.get_current_reset_period(v_transfer.show_id);

  -- Only allow deleting transfers in current reset period
  IF v_transfer.reset_period != v_current_reset_period THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete transfers from past rounds', 'error_code', 'NOT_CURRENT_ROUND');
  END IF;

  -- Get current episode to validate transfer hasn't taken effect yet
  v_active_episode := public.get_current_active_episode(v_transfer.show_id);
  v_current_episode_number := COALESCE(v_active_episode.episode_number, 0);

  -- If the transfer has already taken effect, it cannot be reverted
  IF v_transfer.effective_from_episode <= v_current_episode_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer has already taken effect and cannot be deleted', 'error_code', 'ALREADY_EFFECTIVE');
  END IF;

  -- Revert user_teams changes:
  -- 1. Delete the "incoming" participant record
  DELETE FROM user_teams 
  WHERE show_id = v_transfer.show_id 
    AND user_id = v_user_id 
    AND participant_id = v_transfer.participant_in_id
    AND added_episode = v_transfer.effective_from_episode;

  -- 2. Restore the "outgoing" participant
  UPDATE user_teams 
  SET removed_episode = NULL, removed_at = NULL, updated_at = now()
  WHERE show_id = v_transfer.show_id 
    AND user_id = v_user_id 
    AND participant_id = v_transfer.participant_out_id
    AND removed_episode = v_transfer.effective_from_episode;

  -- Delete the transfer record
  DELETE FROM transfers WHERE id = p_transfer_id;

  -- Get updated transfer status
  v_transfer_status := public.get_next_transfer_time(v_transfer.show_id);

  RETURN jsonb_build_object(
    'success', true,
    'transfers_remaining', (v_transfer_status->>'transfers_remaining')::integer,
    'deleted_transfer', jsonb_build_object(
      'participant_out', v_transfer.out_name,
      'participant_in', v_transfer.in_name
    )
  );
END;
$$;

-- Create edit_transfer_in_current_round RPC
CREATE OR REPLACE FUNCTION public.edit_transfer_in_current_round(
  p_transfer_id uuid, 
  p_new_participant_out_id uuid, 
  p_new_participant_in_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer RECORD;
  v_current_reset_period TEXT;
  v_active_episode public.episodes;
  v_current_episode_number INTEGER;
  v_effective_episode INTEGER;
  v_transfer_status JSONB;
  v_settings public.game_settings;
  v_is_live BOOLEAN := false;
  v_now TIMESTAMPTZ := now();
  v_episode_end_time TIMESTAMPTZ;
  v_current_team UUID[];
  v_new_team UUID[];
  v_team_validation JSONB;
  v_old_slot_position INTEGER;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'NOT_AUTHENTICATED');
  END IF;

  -- Get the transfer
  SELECT * INTO v_transfer FROM transfers WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer not found', 'error_code', 'NOT_FOUND');
  END IF;

  -- Ownership check
  IF v_transfer.user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized', 'error_code', 'NOT_AUTHORIZED');
  END IF;

  -- Get current reset period
  v_current_reset_period := public.get_current_reset_period(v_transfer.show_id);

  -- Only allow editing transfers in current reset period
  IF v_transfer.reset_period != v_current_reset_period THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot edit transfers from past rounds', 'error_code', 'NOT_CURRENT_ROUND');
  END IF;

  -- Get active episode
  v_active_episode := public.get_current_active_episode(v_transfer.show_id);
  v_current_episode_number := COALESCE(v_active_episode.episode_number, 0);
  v_effective_episode := v_transfer.effective_from_episode;

  -- Check if transfer has already taken effect
  IF v_effective_episode <= v_current_episode_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer has already taken effect and cannot be edited', 'error_code', 'ALREADY_EFFECTIVE');
  END IF;

  -- Get game settings for locked_during_live check
  SELECT * INTO v_settings FROM game_settings WHERE show_id = v_transfer.show_id;
  
  IF v_settings IS NOT NULL AND v_settings.transfer_window_mode = 'locked_during_live' AND v_active_episode IS NOT NULL THEN
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
      RETURN jsonb_build_object('success', false, 'error', 'Episode is live - transfers locked', 'error_code', 'LOCKED_DURING_LIVE');
    END IF;
  END IF;

  -- Check if new participant_in is released
  IF NOT public.is_participant_released(p_new_participant_in_id, v_transfer.show_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This participant is not yet available for selection', 'error_code', 'NOT_RELEASED');
  END IF;

  -- Build current team FOR THE CURRENT EPISODE (before this transfer takes effect)
  SELECT array_agg(participant_id) INTO v_current_team
  FROM user_teams
  WHERE show_id = v_transfer.show_id
    AND user_id = v_user_id
    AND added_episode <= v_current_episode_number
    AND (removed_episode IS NULL OR removed_episode > v_current_episode_number);

  -- Also include the old participant_out since we're reverting the pending transfer
  v_current_team := array_append(v_current_team, v_transfer.participant_out_id);
  -- Remove the old participant_in since that's pending
  v_current_team := array_remove(v_current_team, v_transfer.participant_in_id);

  -- Check if new_out is on the current team
  IF NOT (p_new_participant_out_id = ANY(v_current_team)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant not on your current team', 'error_code', 'NOT_ON_TEAM');
  END IF;

  -- Check if new_in is already on current team
  IF p_new_participant_in_id = ANY(v_current_team) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant already on your team', 'error_code', 'ALREADY_ON_TEAM');
  END IF;

  -- Check if new_in is already scheduled to join (from another pending transfer)
  IF EXISTS (
    SELECT 1 FROM user_teams
    WHERE show_id = v_transfer.show_id
      AND user_id = v_user_id
      AND participant_id = p_new_participant_in_id
      AND added_episode > v_current_episode_number
      AND removed_episode IS NULL
  ) AND p_new_participant_in_id != v_transfer.participant_in_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant is already scheduled to join your team', 'error_code', 'ALREADY_SCHEDULED');
  END IF;

  -- Build new team for constraint validation
  v_new_team := array_remove(v_current_team, p_new_participant_out_id);
  v_new_team := array_append(v_new_team, p_new_participant_in_id);

  -- Validate team constraints
  v_team_validation := public.validate_team_constraints(v_transfer.show_id, v_new_team);
  
  IF NOT (v_team_validation->>'valid')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_team_validation->>'error', 'error_code', 'TEAM_INVALID');
  END IF;

  -- Get slot position from old incoming participant
  SELECT slot_position INTO v_old_slot_position
  FROM user_teams
  WHERE show_id = v_transfer.show_id
    AND user_id = v_user_id
    AND participant_id = v_transfer.participant_in_id
    AND added_episode = v_effective_episode;

  -- Revert old transfer effect:
  -- 1. Delete old participant_in entry
  DELETE FROM user_teams 
  WHERE show_id = v_transfer.show_id 
    AND user_id = v_user_id 
    AND participant_id = v_transfer.participant_in_id
    AND added_episode = v_effective_episode;

  -- 2. Restore old participant_out
  UPDATE user_teams 
  SET removed_episode = NULL, removed_at = NULL, updated_at = now()
  WHERE show_id = v_transfer.show_id 
    AND user_id = v_user_id 
    AND participant_id = v_transfer.participant_out_id
    AND removed_episode = v_effective_episode;

  -- Apply new transfer effect:
  -- 1. Mark new participant_out as removed at effective_episode
  UPDATE user_teams
  SET removed_episode = v_effective_episode, removed_at = now(), updated_at = now()
  WHERE show_id = v_transfer.show_id
    AND user_id = v_user_id
    AND participant_id = p_new_participant_out_id
    AND removed_episode IS NULL;

  -- 2. Add new participant_in
  INSERT INTO user_teams (show_id, user_id, participant_id, slot_position, added_episode, added_at)
  VALUES (
    v_transfer.show_id,
    v_user_id,
    p_new_participant_in_id,
    COALESCE(v_old_slot_position, 1),
    v_effective_episode,
    now()
  );

  -- Update the transfer record (same ID, same reset_period, same effective_from_episode)
  UPDATE transfers
  SET 
    participant_out_id = p_new_participant_out_id,
    participant_in_id = p_new_participant_in_id,
    transfer_date = now()
  WHERE id = p_transfer_id;

  -- Get transfer status (remaining count should NOT change)
  v_transfer_status := public.get_next_transfer_time(v_transfer.show_id);

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'transfers_remaining', (v_transfer_status->>'transfers_remaining')::integer
  );
END;
$$;