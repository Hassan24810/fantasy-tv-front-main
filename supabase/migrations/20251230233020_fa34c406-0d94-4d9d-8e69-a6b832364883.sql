-- Add available_from_episode column to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS available_from_episode integer DEFAULT NULL;

COMMENT ON COLUMN public.participants.available_from_episode IS 
  'Episode number from which participant becomes visible to B2C. NULL = immediately available.';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_participants_available_from_episode 
ON public.participants(show_id, available_from_episode);

-- Helper function: Get current visible episode number
CREATE OR REPLACE FUNCTION public.get_current_visible_episode_number(p_show_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_episode_number INTEGER;
BEGIN
  SELECT episode_number INTO v_episode_number
  FROM public.episodes
  WHERE show_id = p_show_id
    AND (is_active = true OR (active_from_datetime IS NOT NULL AND active_from_datetime <= now()))
  ORDER BY episode_number DESC
  LIMIT 1;
  
  RETURN COALESCE(v_episode_number, 0);
END;
$$;

-- Helper function: Check if participant is released
CREATE OR REPLACE FUNCTION public.is_participant_released(
  p_participant_id uuid, 
  p_show_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_from INTEGER;
  v_current_episode INTEGER;
BEGIN
  SELECT available_from_episode INTO v_available_from
  FROM public.participants 
  WHERE id = p_participant_id AND show_id = p_show_id;
  
  -- NULL means immediately available
  IF v_available_from IS NULL THEN 
    RETURN true; 
  END IF;
  
  v_current_episode := public.get_current_visible_episode_number(p_show_id);
  
  RETURN v_available_from <= v_current_episode;
END;
$$;

-- RPC: Get released participants for B2C
CREATE OR REPLACE FUNCTION public.get_released_participants(p_show_id uuid)
RETURNS SETOF public.participants
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_episode INTEGER;
BEGIN
  v_current_episode := public.get_current_visible_episode_number(p_show_id);
  
  RETURN QUERY
  SELECT * FROM public.participants
  WHERE show_id = p_show_id
    AND status = 'active'
    AND visibility = 'show'
    AND (available_from_episode IS NULL OR available_from_episode <= v_current_episode)
  ORDER BY name;
END;
$$;

-- Drop existing public read policy for participants
DROP POLICY IF EXISTS "Participants are publicly readable for active shows" ON public.participants;

-- Create new RLS policy that enforces release status for non-show-owners
CREATE POLICY "Participants are publicly readable if released" ON public.participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shows
    WHERE shows.id = participants.show_id 
    AND shows.status = 'active'
    AND (
      -- Show owner can see all participants
      shows.user_id = auth.uid()
      OR 
      -- Non-owners only see released participants
      (
        participants.available_from_episode IS NULL 
        OR participants.available_from_episode <= public.get_current_visible_episode_number(participants.show_id)
      )
    )
  )
);

-- Update is_participant_selectable to include release check
CREATE OR REPLACE FUNCTION public.is_participant_selectable(p_participant_id uuid, p_show_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participant public.participants;
  v_event public.events;
  v_episode public.episodes;
  v_event_reveal_time timestamptz;
  v_now timestamptz := now();
BEGIN
  -- Get participant
  SELECT * INTO v_participant
  FROM public.participants
  WHERE id = p_participant_id AND show_id = p_show_id;
  
  IF v_participant IS NULL THEN
    RETURN false;
  END IF;
  
  -- NEW: Check if participant is released first
  IF NOT public.is_participant_released(p_participant_id, p_show_id) THEN
    RETURN false;
  END IF;
  
  -- If manually set to inactive (no elimination event), not selectable
  IF v_participant.status = 'inactive' AND v_participant.eliminated_by_event_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- If no elimination event, check base status
  IF v_participant.eliminated_by_event_id IS NULL THEN
    RETURN v_participant.status = 'active';
  END IF;
  
  -- Has elimination event - check if it's been revealed yet
  SELECT * INTO v_event
  FROM public.events
  WHERE id = v_participant.eliminated_by_event_id;
  
  IF v_event IS NULL THEN
    RETURN v_participant.status = 'active';
  END IF;
  
  -- Get the episode for this event
  SELECT * INTO v_episode
  FROM public.episodes
  WHERE show_id = p_show_id AND episode_number = v_event.episode_number;
  
  IF v_episode IS NULL THEN
    RETURN v_participant.status = 'active';
  END IF;
  
  -- Episode not yet live (active_from_datetime in future) -> selectable
  IF v_episode.active_from_datetime IS NULL OR v_episode.active_from_datetime > v_now THEN
    RETURN true;
  END IF;
  
  -- Calculate when the elimination event is revealed
  v_event_reveal_time := v_episode.active_from_datetime + (COALESCE(v_event.event_offset_minutes, 0) || ' minutes')::interval;
  
  -- If event not yet revealed -> selectable
  IF v_now < v_event_reveal_time THEN
    RETURN true;
  END IF;
  
  -- Event has been revealed -> not selectable
  RETURN false;
END;
$$;

-- Update validate_team_constraints to check release status
CREATE OR REPLACE FUNCTION public.validate_team_constraints(p_show_id uuid, p_participant_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings public.game_settings;
  v_team_size INTEGER;
  v_boys_count INTEGER := 0;
  v_girls_count INTEGER := 0;
  v_participant RECORD;
  v_participant_id UUID;
BEGIN
  -- Get game settings
  SELECT * INTO v_settings
  FROM public.game_settings
  WHERE show_id = p_show_id;

  IF v_settings IS NULL THEN
    RETURN jsonb_build_object('valid', true, 'error', null);
  END IF;

  v_team_size := array_length(p_participant_ids, 1);
  
  IF v_team_size IS NULL THEN
    v_team_size := 0;
  END IF;

  -- Check team size
  IF v_team_size != v_settings.team_size THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team must have exactly ' || v_settings.team_size || ' players'
    );
  END IF;

  -- NEW: Check all participants are released
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    IF NOT public.is_participant_released(v_participant_id, p_show_id) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'One or more participants are not yet available'
      );
    END IF;
  END LOOP;

  -- Count boys and girls
  FOR v_participant IN
    SELECT p.* FROM public.participants p
    WHERE p.id = ANY(p_participant_ids)
  LOOP
    NULL;
  END LOOP;

  -- Check min/max boys
  IF v_settings.min_boys IS NOT NULL AND v_boys_count < v_settings.min_boys THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team must have at least ' || v_settings.min_boys || ' boys'
    );
  END IF;

  IF v_settings.max_boys IS NOT NULL AND v_boys_count > v_settings.max_boys THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team can have maximum ' || v_settings.max_boys || ' boys'
    );
  END IF;

  -- Check min/max girls
  IF v_settings.min_girls IS NOT NULL AND v_girls_count < v_settings.min_girls THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team must have at least ' || v_settings.min_girls || ' girls'
    );
  END IF;

  IF v_settings.max_girls IS NOT NULL AND v_girls_count > v_settings.max_girls THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team can have maximum ' || v_settings.max_girls || ' girls'
    );
  END IF;

  RETURN jsonb_build_object('valid', true, 'error', null);
END;
$$;

-- Update validate_and_execute_transfer to check release status
CREATE OR REPLACE FUNCTION public.validate_and_execute_transfer(p_show_id uuid, p_participant_out_id uuid, p_participant_in_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer_status JSONB;
  v_active_episode public.episodes;
  v_reset_period TEXT;
  v_current_team UUID[];
  v_new_team UUID[];
  v_team_validation JSONB;
  v_out_team_record public.user_teams;
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

  -- Execute transfer: mark old participant as removed
  UPDATE public.user_teams
  SET removed_episode = COALESCE(v_active_episode.episode_number, 1),
      removed_at = now(),
      updated_at = now()
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND participant_id = p_participant_out_id
    AND removed_episode IS NULL
  RETURNING * INTO v_out_team_record;

  -- Add new participant
  INSERT INTO public.user_teams (show_id, user_id, participant_id, slot_position, added_episode, added_at)
  VALUES (
    p_show_id,
    v_user_id,
    p_participant_in_id,
    COALESCE(v_out_team_record.slot_position, 1),
    COALESCE(v_active_episode.episode_number, 1),
    now()
  );

  -- Record transfer
  INSERT INTO public.transfers (show_id, user_id, participant_out_id, participant_in_id, transfer_date, reset_period)
  VALUES (p_show_id, v_user_id, p_participant_out_id, p_participant_in_id, now(), v_reset_period);

  -- Get updated transfer count
  v_transfer_status := public.get_next_transfer_time(p_show_id);

  RETURN jsonb_build_object(
    'success', true,
    'transfers_remaining', (v_transfer_status->>'transfers_remaining')::integer
  );
END;
$$;

-- Update create_event_with_participants to validate release status
CREATE OR REPLACE FUNCTION public.create_event_with_participants(p_show_id uuid, p_episode_number integer, p_rule_id uuid, p_participant_ids uuid[], p_event_date timestamp with time zone DEFAULT now(), p_notes text DEFAULT NULL::text, p_event_offset_minutes integer DEFAULT 0)
RETURNS jsonb
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
  v_is_elimination BOOLEAN;
  v_participant_record public.participants;
BEGIN
  -- Verify user owns the show
  IF NOT EXISTS (
    SELECT 1 FROM shows WHERE id = p_show_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create events for this show');
  END IF;

  -- Get points and elimination flag from rule
  SELECT points, is_elimination INTO v_points, v_is_elimination 
  FROM game_rules WHERE id = p_rule_id AND show_id = p_show_id;
  
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

  -- NEW: Validate participants are released for this episode
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    SELECT * INTO v_participant_record FROM public.participants WHERE id = v_participant_id;
    IF v_participant_record.available_from_episode IS NOT NULL AND v_participant_record.available_from_episode > p_episode_number THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Participant "' || v_participant_record.name || '" is not available until episode ' || v_participant_record.available_from_episode
      );
    END IF;
  END LOOP;

  -- Insert event (participant_id stores first participant for backward compatibility)
  INSERT INTO events (show_id, episode_number, rule_id, participant_id, points_awarded, event_date, notes, event_offset_minutes)
  VALUES (
    p_show_id, 
    p_episode_number, 
    p_rule_id, 
    p_participant_ids[1], 
    v_points * array_length(p_participant_ids, 1), 
    COALESCE(p_event_date, now()), 
    p_notes,
    COALESCE(p_event_offset_minutes, 0)
  )
  RETURNING id INTO v_event_id;

  -- Insert all participants atomically
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    INSERT INTO event_participants (event_id, participant_id, points_awarded, participant_position)
    VALUES (v_event_id, v_participant_id, v_points, v_position);
    v_position := v_position + 1;
  END LOOP;

  -- If this is an elimination rule, mark participants as eliminated
  IF v_is_elimination = true THEN
    UPDATE public.participants 
    SET eliminated_episode = p_episode_number,
        eliminated_by_event_id = v_event_id,
        updated_at = now()
    WHERE id = ANY(p_participant_ids);
  END IF;

  -- Update episode event count
  UPDATE episodes 
  SET events_count = events_count + 1 
  WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;