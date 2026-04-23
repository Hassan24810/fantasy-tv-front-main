-- Add is_elimination column to game_rules
ALTER TABLE public.game_rules ADD COLUMN is_elimination boolean NOT NULL DEFAULT false;

-- Add eliminated_by_event_id to participants to track which event eliminated them
ALTER TABLE public.participants ADD COLUMN eliminated_by_event_id uuid REFERENCES public.events(id);

-- Create function to check if a participant is selectable (for transfers/team building)
CREATE OR REPLACE FUNCTION public.is_participant_selectable(
  p_participant_id uuid,
  p_show_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update create_event_with_participants to handle elimination events
CREATE OR REPLACE FUNCTION public.create_event_with_participants(
  p_show_id uuid, 
  p_episode_number integer, 
  p_rule_id uuid, 
  p_participant_ids uuid[], 
  p_event_date timestamp with time zone DEFAULT now(), 
  p_notes text DEFAULT NULL::text, 
  p_event_offset_minutes integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
  v_points INTEGER;
  v_participant_id UUID;
  v_position INTEGER := 1;
  v_user_id UUID := auth.uid();
  v_is_elimination BOOLEAN;
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
$function$;