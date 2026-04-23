
CREATE OR REPLACE FUNCTION public.validate_team_constraints(p_participant_ids uuid[], p_show_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.game_settings;
  v_team_size INTEGER;
  v_boys_count INTEGER := 0;
  v_girls_count INTEGER := 0;
  v_total_price INTEGER := 0;
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

  -- Check all participants are released
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    IF NOT public.is_participant_released(v_participant_id, p_show_id) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'One or more participants are not yet available'
      );
    END IF;
  END LOOP;

  -- Count boys/girls and sum prices
  FOR v_participant IN
    SELECT p.gender, p.price FROM public.participants p
    WHERE p.id = ANY(p_participant_ids)
  LOOP
    IF LOWER(COALESCE(v_participant.gender, '')) = 'male' THEN
      v_boys_count := v_boys_count + 1;
    ELSIF LOWER(COALESCE(v_participant.gender, '')) = 'female' THEN
      v_girls_count := v_girls_count + 1;
    END IF;

    v_total_price := v_total_price + COALESCE(v_participant.price, 0);
  END LOOP;

  -- Check min boys
  IF v_settings.min_boys > 0 AND v_boys_count < v_settings.min_boys THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team must have at least ' || v_settings.min_boys || ' boys'
    );
  END IF;

  -- Check max boys
  IF v_settings.max_boys IS NOT NULL AND v_boys_count > v_settings.max_boys THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team can have maximum ' || v_settings.max_boys || ' boys'
    );
  END IF;

  -- Check min girls
  IF v_settings.min_girls > 0 AND v_girls_count < v_settings.min_girls THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team must have at least ' || v_settings.min_girls || ' girls'
    );
  END IF;

  -- Check max girls
  IF v_settings.max_girls IS NOT NULL AND v_girls_count > v_settings.max_girls THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Team can have maximum ' || v_settings.max_girls || ' girls'
    );
  END IF;

  -- Check budget constraint
  IF v_settings.budget_mode_enabled = true AND v_settings.budget_amount IS NOT NULL THEN
    IF v_total_price > v_settings.budget_amount THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'Team total price (' || v_total_price || ') exceeds budget (' || v_settings.budget_amount || ')'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('valid', true, 'error', null);
END;
$$;
