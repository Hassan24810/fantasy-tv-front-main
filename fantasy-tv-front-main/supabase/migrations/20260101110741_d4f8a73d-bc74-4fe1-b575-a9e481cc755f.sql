-- Fix corrupted points_per_position values stored as strings instead of arrays
UPDATE game_rules
SET points_per_position = (points_per_position #>> '{}')::jsonb
WHERE jsonb_typeof(points_per_position) = 'string';

-- Replace create_event_with_participants with hardened version that handles multi-participant rules
CREATE OR REPLACE FUNCTION public.create_event_with_participants(
  p_show_id uuid, 
  p_episode_number integer, 
  p_rule_id uuid, 
  p_participant_ids uuid[], 
  p_event_date timestamp with time zone DEFAULT now(), 
  p_notes text DEFAULT NULL::text
)
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
BEGIN
  -- Verify user owns the show
  IF NOT EXISTS (
    SELECT 1 FROM shows WHERE id = p_show_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create events for this show', 'error_code', 'NOT_AUTHORIZED');
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
  
  -- Handle case where points_per_position was stored as a JSON string (legacy bug)
  IF v_points_raw IS NOT NULL AND jsonb_typeof(v_points_raw) = 'string' THEN
    BEGIN
      -- Unwrap the string and parse as JSON
      v_points_array := (v_points_raw #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid points_per_position format in rule', 'error_code', 'INVALID_POINTS_FORMAT');
    END;
  ELSE
    -- Use the value directly or fallback to single points value
    v_points_array := COALESCE(v_points_raw, jsonb_build_array(v_rule.points));
  END IF;
  
  -- Final validation: ensure it's an array
  IF v_points_array IS NULL OR jsonb_typeof(v_points_array) != 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'points_per_position must be an array', 'error_code', 'INVALID_POINTS_FORMAT');
  END IF;

  v_array_length := jsonb_array_length(v_points_array);
  
  IF v_array_length = 0 THEN
    -- Fallback to rule's points value if array is empty
    v_points_array := jsonb_build_array(v_rule.points);
    v_array_length := 1;
  END IF;

  -- Insert the main event record
  INSERT INTO events (show_id, episode_number, rule_id, participant_id, points_awarded, event_date, notes)
  VALUES (
    p_show_id, 
    p_episode_number, 
    p_rule_id, 
    p_participant_ids[1], -- First participant for backward compatibility
    0, -- Will be updated after calculating total
    COALESCE(p_event_date, now()), 
    p_notes
  )
  RETURNING id INTO v_event_id;

  -- Insert all participants with their position-based points
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    -- Get points for this position (1-indexed)
    IF v_position <= v_array_length THEN
      v_point_value := (v_points_array->(v_position - 1))::integer;
    ELSE
      -- For variable mode or extra participants: use the last value in the array
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