-- Drop existing functions first to allow parameter name change
DROP FUNCTION IF EXISTS public.create_event_with_participants(uuid, integer, uuid, uuid[], timestamp with time zone, text, integer);
DROP FUNCTION IF EXISTS public.update_event_with_participants(uuid, uuid, uuid[], integer, text);

-- Recreate create_event_with_participants with p_event_offset_seconds
CREATE OR REPLACE FUNCTION public.create_event_with_participants(
  p_show_id uuid, 
  p_episode_number integer, 
  p_rule_id uuid, 
  p_participant_ids uuid[], 
  p_event_date timestamp with time zone DEFAULT now(), 
  p_notes text DEFAULT NULL::text,
  p_event_offset_seconds integer DEFAULT 0
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

  -- Insert the main event record with both seconds and minutes (for backward compatibility)
  INSERT INTO events (show_id, episode_number, rule_id, participant_id, points_awarded, event_date, notes, event_offset_seconds, event_offset_minutes)
  VALUES (
    p_show_id, 
    p_episode_number, 
    p_rule_id, 
    p_participant_ids[1],
    0,
    COALESCE(p_event_date, now()), 
    p_notes,
    COALESCE(p_event_offset_seconds, 0),
    COALESCE(p_event_offset_seconds, 0) / 60
  )
  RETURNING id INTO v_event_id;

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

  UPDATE events SET points_awarded = v_total_points WHERE id = v_event_id;

  UPDATE episodes 
  SET events_count = events_count + 1 
  WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'total_points', v_total_points);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'UNKNOWN_ERROR');
END;
$function$;

-- Recreate update_event_with_participants with p_event_offset_seconds
CREATE OR REPLACE FUNCTION public.update_event_with_participants(
  p_event_id uuid, 
  p_rule_id uuid, 
  p_participant_ids uuid[], 
  p_event_offset_seconds integer DEFAULT 0, 
  p_notes text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event RECORD;
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
  SELECT e.*, s.user_id as show_owner_id 
  INTO v_event 
  FROM events e
  JOIN shows s ON s.id = e.show_id
  WHERE e.id = p_event_id;
  
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found', 'error_code', 'NOT_FOUND');
  END IF;

  IF v_event.show_owner_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized', 'error_code', 'NOT_AUTHORIZED');
  END IF;

  SELECT * INTO v_rule FROM game_rules WHERE id = p_rule_id AND show_id = v_event.show_id;
  
  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid rule for this show', 'error_code', 'INVALID_RULE');
  END IF;

  IF NOT (
    SELECT bool_and(EXISTS (SELECT 1 FROM participants WHERE id = pid AND show_id = v_event.show_id))
    FROM unnest(p_participant_ids) AS pid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or more participants are invalid', 'error_code', 'INVALID_PARTICIPANTS');
  END IF;

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

  DELETE FROM event_participants WHERE event_id = p_event_id;

  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    IF v_position <= v_array_length THEN
      v_point_value := (v_points_array->(v_position - 1))::integer;
    ELSE
      v_point_value := (v_points_array->(v_array_length - 1))::integer;
    END IF;
    
    v_total_points := v_total_points + v_point_value;
    
    INSERT INTO event_participants (event_id, participant_id, points_awarded, participant_position)
    VALUES (p_event_id, v_participant_id, v_point_value, v_position);
    
    v_position := v_position + 1;
  END LOOP;

  UPDATE events SET
    rule_id = p_rule_id,
    participant_id = p_participant_ids[1],
    points_awarded = v_total_points,
    event_offset_seconds = COALESCE(p_event_offset_seconds, 0),
    event_offset_minutes = COALESCE(p_event_offset_seconds, 0) / 60,
    notes = p_notes
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'event_id', p_event_id, 'total_points', v_total_points);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'UNKNOWN_ERROR');
END;
$function$;