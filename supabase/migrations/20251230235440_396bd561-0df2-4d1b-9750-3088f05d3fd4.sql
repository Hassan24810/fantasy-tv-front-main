-- 1. Add new columns to game_rules
ALTER TABLE public.game_rules 
ADD COLUMN IF NOT EXISTS points_per_position jsonb DEFAULT NULL;

ALTER TABLE public.game_rules 
ADD COLUMN IF NOT EXISTS participant_count_mode text DEFAULT 'exact';

COMMENT ON COLUMN public.game_rules.points_per_position IS 
  'JSON array of points per position, e.g., [10, -5]. NULL = use legacy single points value for all.';

COMMENT ON COLUMN public.game_rules.participant_count_mode IS 
  'exact = fixed number of participants; variable = 1+ participants allowed';

-- 2. Create rule_templates table for prebuilt templates
CREATE TABLE IF NOT EXISTS public.rule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template text NOT NULL,
  participants_count integer NOT NULL DEFAULT 1,
  participant_count_mode text NOT NULL DEFAULT 'exact',
  points_per_position jsonb NOT NULL,
  icon text DEFAULT 'star',
  event_type text NOT NULL DEFAULT 'positive',
  is_elimination boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on rule_templates (public read-only)
ALTER TABLE public.rule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rule templates are publicly readable" 
ON public.rule_templates FOR SELECT 
USING (true);

-- 4. Insert prebuilt templates (idempotent using ON CONFLICT)
INSERT INTO public.rule_templates (id, name, description, template, participants_count, participant_count_mode, points_per_position, icon, event_type, is_elimination, sort_order)
VALUES 
  ('00000000-0000-0000-0001-000000000001', 'Won a Challenge', 'Single participant wins a challenge', '{P1} won the challenge', 1, 'exact', '[10]', 'trophy', 'positive', false, 1),
  ('00000000-0000-0000-0001-000000000002', 'First Kiss', 'Two participants share a first kiss', '{P1} kissed {P2}', 2, 'exact', '[5, 5]', 'heart', 'positive', false, 2),
  ('00000000-0000-0000-0001-000000000003', 'Voted Out', 'One participant voted out another', '{P1} voted out {P2}', 2, 'exact', '[3, -10]', 'vote', 'negative', false, 3),
  ('00000000-0000-0000-0001-000000000004', 'Alliance Formed', 'Multiple participants formed an alliance', '{P1} and {P2} formed an alliance', 2, 'exact', '[5, 5]', 'users', 'positive', false, 4),
  ('00000000-0000-0000-0001-000000000005', 'Eliminated', 'Participant was eliminated from the show', '{P1} was eliminated', 1, 'exact', '[-20]', 'zap', 'elimination', true, 5),
  ('00000000-0000-0000-0001-000000000006', 'Betrayed', 'One participant betrayed another', '{P1} betrayed {P2}', 2, 'exact', '[10, -15]', 'zap', 'negative', false, 6),
  ('00000000-0000-0000-0001-000000000007', 'Won Immunity', 'Single participant won immunity', '{P1} won immunity', 1, 'exact', '[15]', 'shield', 'positive', false, 7),
  ('00000000-0000-0000-0001-000000000008', 'Group Event', 'Multiple participants in a group event', '{P1}, {P2} participated', 2, 'variable', '[5]', 'users', 'positive', false, 8)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template = EXCLUDED.template,
  participants_count = EXCLUDED.participants_count,
  participant_count_mode = EXCLUDED.participant_count_mode,
  points_per_position = EXCLUDED.points_per_position,
  icon = EXCLUDED.icon,
  event_type = EXCLUDED.event_type,
  is_elimination = EXCLUDED.is_elimination,
  sort_order = EXCLUDED.sort_order;

-- 5. Migrate existing rules to use points_per_position (backward compatible)
UPDATE public.game_rules
SET points_per_position = jsonb_build_array(points)
WHERE points_per_position IS NULL;

-- 6. Create format_event_display_text helper function
CREATE OR REPLACE FUNCTION public.format_event_display_text(
  p_template text,
  p_participants jsonb
) RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_result text := COALESCE(p_template, '');
  v_participant jsonb;
  v_position integer;
  v_name text;
  v_points integer;
  v_point_text text;
BEGIN
  IF p_participants IS NULL OR jsonb_array_length(p_participants) = 0 THEN
    RETURN v_result;
  END IF;

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_position := (v_participant->>'position')::integer;
    v_name := v_participant->>'name';
    v_points := (v_participant->>'points')::integer;
    
    -- Format points with sign for display
    IF v_points >= 0 THEN
      v_point_text := v_points::text;
    ELSE
      v_point_text := v_points::text;
    END IF;
    
    -- Replace {P1}, {P2}, etc. with "Name (points)"
    v_result := REPLACE(v_result, '{P' || v_position || '}', v_name || ' (' || v_point_text || ')');
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- 7. Update create_event_with_participants to use position-based points
CREATE OR REPLACE FUNCTION public.create_event_with_participants(
  p_show_id uuid,
  p_episode_number integer,
  p_rule_id uuid,
  p_participant_ids uuid[],
  p_event_date timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL,
  p_event_offset_minutes integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_event_id UUID;
  v_rule public.game_rules;
  v_participant_id UUID;
  v_position INTEGER := 1;
  v_user_id UUID := auth.uid();
  v_points_array jsonb;
  v_point_value INTEGER;
  v_total_points INTEGER := 0;
  v_participant_record public.participants;
BEGIN
  -- Verify user owns the show
  IF NOT EXISTS (SELECT 1 FROM shows WHERE id = p_show_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create events for this show');
  END IF;

  -- Get rule
  SELECT * INTO v_rule FROM game_rules WHERE id = p_rule_id AND show_id = p_show_id;
  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid rule for this show');
  END IF;

  -- Validate participant count based on mode
  IF v_rule.participant_count_mode = 'exact' AND array_length(p_participant_ids, 1) != v_rule.participants_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expected exactly ' || v_rule.participants_count || ' participant(s) for this rule');
  END IF;

  IF v_rule.participant_count_mode = 'variable' AND array_length(p_participant_ids, 1) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least 1 participant is required');
  END IF;

  -- Validate participants exist and belong to the show
  IF NOT (
    SELECT bool_and(EXISTS (SELECT 1 FROM participants WHERE id = pid AND show_id = p_show_id))
    FROM unnest(p_participant_ids) AS pid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or more participants are invalid');
  END IF;

  -- Validate participants are released for this episode
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

  -- Determine points array: use points_per_position if set, else fallback to legacy points
  v_points_array := COALESCE(v_rule.points_per_position, jsonb_build_array(v_rule.points));

  -- Insert event
  INSERT INTO events (show_id, episode_number, rule_id, participant_id, points_awarded, event_date, notes, event_offset_minutes)
  VALUES (
    p_show_id, 
    p_episode_number, 
    p_rule_id, 
    p_participant_ids[1], 
    0, -- Will be updated with total
    COALESCE(p_event_date, now()), 
    p_notes,
    COALESCE(p_event_offset_minutes, 0)
  )
  RETURNING id INTO v_event_id;

  -- Insert participants with position-based points
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    -- Get points for this position
    -- If position exceeds array length, use the last value (for variable mode)
    IF v_position <= jsonb_array_length(v_points_array) THEN
      v_point_value := (v_points_array->(v_position - 1))::integer;
    ELSE
      v_point_value := (v_points_array->(jsonb_array_length(v_points_array) - 1))::integer;
    END IF;
    
    v_total_points := v_total_points + v_point_value;
    
    INSERT INTO event_participants (event_id, participant_id, points_awarded, participant_position)
    VALUES (v_event_id, v_participant_id, v_point_value, v_position);
    
    v_position := v_position + 1;
  END LOOP;

  -- Update event total points
  UPDATE events SET points_awarded = v_total_points WHERE id = v_event_id;

  -- If this is an elimination rule, mark participants as eliminated
  IF v_rule.is_elimination = true THEN
    UPDATE public.participants 
    SET eliminated_episode = p_episode_number,
        eliminated_by_event_id = v_event_id,
        updated_at = now()
    WHERE id = ANY(p_participant_ids);
  END IF;

  -- Update episode event count
  UPDATE episodes SET events_count = events_count + 1 
  WHERE show_id = p_show_id AND episode_number = p_episode_number;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 8. Add realtime for rule_templates
ALTER PUBLICATION supabase_realtime ADD TABLE public.rule_templates;