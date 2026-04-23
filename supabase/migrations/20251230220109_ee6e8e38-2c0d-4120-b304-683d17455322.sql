-- Drop the old function with the old parameter name first
DROP FUNCTION IF EXISTS public.get_episode_status(boolean, timestamp with time zone, timestamp with time zone, integer);

-- Recreate with the new parameter name (seconds)
CREATE OR REPLACE FUNCTION public.get_episode_status(p_is_active boolean, p_active_from_datetime timestamp with time zone, p_active_until_datetime timestamp with time zone, p_episode_duration_seconds integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_end_time timestamptz;
BEGIN
  -- Calculate end time: use active_until_datetime if set, otherwise compute from start + duration
  IF p_active_until_datetime IS NOT NULL THEN
    v_end_time := p_active_until_datetime;
  ELSIF p_active_from_datetime IS NOT NULL AND p_episode_duration_seconds IS NOT NULL THEN
    v_end_time := p_active_from_datetime + (p_episode_duration_seconds || ' seconds')::interval;
  ELSIF p_is_active = true AND p_episode_duration_seconds IS NOT NULL THEN
    v_end_time := NULL;
  ELSE
    v_end_time := NULL;
  END IF;
  
  -- UPCOMING: scheduled but not yet started
  IF p_is_active = false AND p_active_from_datetime IS NOT NULL AND p_active_from_datetime > v_now THEN
    RETURN 'UPCOMING';
  END IF;
  
  -- LIVE: currently within the live window
  IF p_is_active = true OR (p_active_from_datetime IS NOT NULL AND p_active_from_datetime <= v_now) THEN
    IF v_end_time IS NULL OR v_now < v_end_time THEN
      RETURN 'LIVE';
    ELSE
      RETURN 'ENDED';
    END IF;
  END IF;
  
  -- Default: not active and no schedule
  RETURN 'DRAFT';
END;
$function$;

-- Update get_next_transfer_time function to use seconds (it reads episode_duration_seconds from the episodes table now)
CREATE OR REPLACE FUNCTION public.get_next_transfer_time(p_show_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_settings public.game_settings;
  v_active_episode public.episodes;
  v_reset_period TEXT;
  v_transfers_used INTEGER;
  v_can_transfer BOOLEAN := true;
  v_reason TEXT := '';
  v_next_allowed TIMESTAMPTZ := now();
  v_next_episode public.episodes;
  v_current_batch INTEGER;
  v_next_batch_start INTEGER;
  v_episode_end_time TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_transfer', false,
      'reason', 'Not authenticated',
      'next_allowed_datetime', null,
      'transfers_remaining', 0,
      'reset_period', null
    );
  END IF;

  SELECT * INTO v_settings
  FROM public.game_settings
  WHERE show_id = p_show_id;

  IF v_settings IS NULL THEN
    RETURN jsonb_build_object(
      'can_transfer', true,
      'reason', 'No settings configured',
      'next_allowed_datetime', null,
      'transfers_remaining', 999,
      'reset_period', 'UNLIMITED'
    );
  END IF;

  v_active_episode := public.get_current_active_episode(p_show_id);
  v_reset_period := public.get_current_reset_period(p_show_id);
  
  SELECT COUNT(*) INTO v_transfers_used
  FROM public.transfers
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND reset_period = v_reset_period;

  -- Calculate episode end time using seconds
  IF v_active_episode IS NOT NULL THEN
    IF v_active_episode.active_until_datetime IS NOT NULL THEN
      v_episode_end_time := v_active_episode.active_until_datetime;
    ELSIF v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.episode_duration_seconds IS NOT NULL THEN
      v_episode_end_time := v_active_episode.active_from_datetime + (v_active_episode.episode_duration_seconds || ' seconds')::interval;
    ELSE
      v_episode_end_time := NULL;
    END IF;
  END IF;

  CASE v_settings.transfer_window_mode
    WHEN 'locked_during_live' THEN
      IF v_active_episode IS NOT NULL THEN
        DECLARE
          v_is_live BOOLEAN := false;
          v_now TIMESTAMPTZ := now();
        BEGIN
          IF v_active_episode.is_active = true OR (v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.active_from_datetime <= v_now) THEN
            IF v_episode_end_time IS NULL OR v_now < v_episode_end_time THEN
              v_is_live := true;
            END IF;
          END IF;
          
          IF v_is_live THEN
            v_can_transfer := false;
            v_reason := 'Episode is live - transfers locked';
            v_next_allowed := COALESCE(v_episode_end_time, v_now + interval '2 hours');
          END IF;
        END;
      END IF;
    WHEN 'time_window' THEN
      v_can_transfer := true;
    ELSE
      v_can_transfer := true;
  END CASE;

  IF v_can_transfer AND v_transfers_used >= v_settings.transfers_per_reset THEN
    v_can_transfer := false;
    v_reason := 'No transfers remaining this period';
    
    CASE v_settings.transfer_reset_frequency
      WHEN 'per_episode' THEN
        SELECT * INTO v_next_episode
        FROM public.episodes
        WHERE show_id = p_show_id
          AND episode_number > COALESCE(v_active_episode.episode_number, 0)
        ORDER BY episode_number ASC
        LIMIT 1;
        
        IF v_next_episode IS NOT NULL THEN
          v_next_allowed := COALESCE(v_next_episode.active_from_datetime, now() + interval '1 week');
          v_reason := v_reason || '. Resets: Episode ' || v_next_episode.episode_number || ' activation';
        END IF;
      WHEN 'every_x_episodes' THEN
        v_current_batch := CEIL(COALESCE(v_active_episode.episode_number, 1)::numeric / COALESCE(v_settings.episode_reset_interval, 1)::numeric);
        v_next_batch_start := (v_current_batch * COALESCE(v_settings.episode_reset_interval, 1)) + 1;
        
        SELECT * INTO v_next_episode
        FROM public.episodes
        WHERE show_id = p_show_id
          AND episode_number = v_next_batch_start
        ORDER BY episode_number ASC
        LIMIT 1;
        
        IF v_next_episode IS NOT NULL THEN
          v_next_allowed := COALESCE(v_next_episode.active_from_datetime, now() + interval '1 week');
          v_reason := v_reason || '. Resets: Episode ' || v_next_episode.episode_number || ' activation (every ' || v_settings.episode_reset_interval || ' episodes)';
        ELSE
          v_reason := v_reason || '. Resets: Episode ' || v_next_batch_start || ' (not yet created)';
        END IF;
      WHEN 'weekly' THEN
        v_next_allowed := date_trunc('week', now()) + interval '1 week';
      WHEN 'monthly' THEN
        v_next_allowed := date_trunc('month', now()) + interval '1 month';
      ELSE
        v_next_allowed := now();
    END CASE;
  END IF;

  IF v_can_transfer AND v_settings.lock_roster_after_episode = true AND v_active_episode IS NOT NULL THEN
    DECLARE
      v_is_live BOOLEAN := false;
      v_now TIMESTAMPTZ := now();
    BEGIN
      IF v_active_episode.is_active = true OR (v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.active_from_datetime <= v_now) THEN
        IF v_episode_end_time IS NULL OR v_now < v_episode_end_time THEN
          v_is_live := true;
        END IF;
      END IF;
      
      IF v_is_live THEN
        v_can_transfer := false;
        v_reason := 'Roster locked during live episode';
        v_next_allowed := COALESCE(v_episode_end_time, v_now + interval '2 hours');
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'can_transfer', v_can_transfer,
    'reason', v_reason,
    'next_allowed_datetime', v_next_allowed,
    'transfers_remaining', GREATEST(0, v_settings.transfers_per_reset - v_transfers_used),
    'reset_period', v_reset_period
  );
END;
$function$;