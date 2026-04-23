-- Add episode_duration_minutes to episodes table
ALTER TABLE public.episodes 
ADD COLUMN IF NOT EXISTS episode_duration_minutes integer DEFAULT 60;

-- Add event_offset_minutes to events table (time from episode start when event is revealed)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_offset_minutes integer DEFAULT 0;

-- Update the get_current_active_episode function to include duration
CREATE OR REPLACE FUNCTION public.get_current_active_episode(p_show_id uuid)
 RETURNS episodes
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.episodes
  WHERE show_id = p_show_id
    AND (is_active = true OR (active_from_datetime IS NOT NULL AND active_from_datetime <= now()))
  ORDER BY episode_number DESC
  LIMIT 1;
$function$;

-- Create a function to get episode status (UPCOMING, LIVE, ENDED)
CREATE OR REPLACE FUNCTION public.get_episode_status(
  p_is_active boolean,
  p_active_from_datetime timestamptz,
  p_active_until_datetime timestamptz,
  p_episode_duration_minutes integer
)
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
  ELSIF p_active_from_datetime IS NOT NULL AND p_episode_duration_minutes IS NOT NULL THEN
    v_end_time := p_active_from_datetime + (p_episode_duration_minutes || ' minutes')::interval;
  ELSIF p_is_active = true AND p_episode_duration_minutes IS NOT NULL THEN
    -- Manual activation without scheduled time - assume started now (for display purposes)
    v_end_time := NULL; -- No end time for manual activation without schedule
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

-- Update get_next_transfer_time to respect episode live window duration
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

  -- Get game settings
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

  -- Get current active episode
  v_active_episode := public.get_current_active_episode(p_show_id);
  
  -- Get current reset period and transfers used
  v_reset_period := public.get_current_reset_period(p_show_id);
  
  SELECT COUNT(*) INTO v_transfers_used
  FROM public.transfers
  WHERE show_id = p_show_id
    AND user_id = v_user_id
    AND reset_period = v_reset_period;

  -- Calculate episode end time
  IF v_active_episode IS NOT NULL THEN
    IF v_active_episode.active_until_datetime IS NOT NULL THEN
      v_episode_end_time := v_active_episode.active_until_datetime;
    ELSIF v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.episode_duration_minutes IS NOT NULL THEN
      v_episode_end_time := v_active_episode.active_from_datetime + (v_active_episode.episode_duration_minutes || ' minutes')::interval;
    ELSE
      v_episode_end_time := NULL;
    END IF;
  END IF;

  -- Check transfer window mode
  CASE v_settings.transfer_window_mode
    WHEN 'locked_during_live' THEN
      -- Check if episode is currently LIVE (within the live window)
      IF v_active_episode IS NOT NULL THEN
        DECLARE
          v_is_live BOOLEAN := false;
          v_now TIMESTAMPTZ := now();
          v_start_time TIMESTAMPTZ := COALESCE(v_active_episode.active_from_datetime, now());
        BEGIN
          -- Episode is live if: manually active OR within scheduled window
          IF v_active_episode.is_active = true OR (v_active_episode.active_from_datetime IS NOT NULL AND v_active_episode.active_from_datetime <= v_now) THEN
            -- Check if still within the live window (not ended)
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

  -- Check transfers remaining
  IF v_can_transfer AND v_transfers_used >= v_settings.transfers_per_reset THEN
    v_can_transfer := false;
    v_reason := 'No transfers remaining this period';
    
    -- Calculate next reset time based on frequency
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
        -- Calculate the next batch boundary
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

  -- Check lock_roster_after_episode (also uses live window)
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

-- Update calculate_participant_points to filter by event reveal time
CREATE OR REPLACE FUNCTION public.calculate_participant_points(p_participant_id uuid, p_show_id uuid, p_episode_number integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_points INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(ep.points_awarded), 0) INTO v_total_points
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.episodes epi ON epi.show_id = e.show_id AND epi.episode_number = e.episode_number
  WHERE ep.participant_id = p_participant_id
    AND e.show_id = p_show_id
    AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
    -- Event reveal check: event is revealed when episode_start + offset <= now
    AND (
      epi.active_from_datetime IS NULL 
      OR epi.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
    )
    AND (p_episode_number IS NULL OR e.episode_number = p_episode_number);

  RETURN v_total_points;
END;
$function$;

-- Update calculate_user_total_points to filter by event reveal time
CREATE OR REPLACE FUNCTION public.calculate_user_total_points(p_show_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_total_points INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Sum points from event_participants where participant was on user's team during that episode
  -- Only include events that have been revealed (based on offset)
  SELECT COALESCE(SUM(ep.points_awarded), 0) INTO v_total_points
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.episodes epi ON epi.show_id = e.show_id AND epi.episode_number = e.episode_number
  JOIN public.user_teams ut ON ut.participant_id = ep.participant_id AND ut.show_id = e.show_id AND ut.user_id = v_user_id
  WHERE e.show_id = p_show_id
    AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
    -- Event reveal check
    AND (
      epi.active_from_datetime IS NULL 
      OR epi.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
    )
    AND ut.added_episode <= e.episode_number
    AND (ut.removed_episode IS NULL OR ut.removed_episode > e.episode_number);

  RETURN v_total_points;
END;
$function$;

-- Update calculate_user_gameweek_points to filter by event reveal time
CREATE OR REPLACE FUNCTION public.calculate_user_gameweek_points(p_show_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_active_episode public.episodes;
  v_gw_points INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  v_active_episode := public.get_current_active_episode(p_show_id);
  
  IF v_active_episode IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(ep.points_awarded), 0) INTO v_gw_points
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.user_teams ut ON ut.participant_id = ep.participant_id AND ut.show_id = e.show_id AND ut.user_id = v_user_id
  WHERE e.show_id = p_show_id
    AND e.episode_number = v_active_episode.episode_number
    -- Event reveal check
    AND (
      v_active_episode.active_from_datetime IS NULL 
      OR v_active_episode.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
    )
    AND ut.added_episode <= e.episode_number
    AND (ut.removed_episode IS NULL OR ut.removed_episode > e.episode_number);

  RETURN v_gw_points;
END;
$function$;

-- Update admin_get_show_users_with_live_points to filter by event reveal time
CREATE OR REPLACE FUNCTION public.admin_get_show_users_with_live_points(p_show_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, username text, email text, avatar_url text, gender text, joined_at timestamp with time zone, total_points bigint, gameweek_points bigint, team_size bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_active_episode_number INTEGER;
  v_active_episode public.episodes;
BEGIN
  -- Get current active episode
  v_active_episode := public.get_current_active_episode(p_show_id);
  v_active_episode_number := v_active_episode.episode_number;

  RETURN QUERY
  WITH visible_episodes AS (
    SELECT ep.episode_number, ep.active_from_datetime
    FROM episodes ep
    WHERE ep.show_id = p_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  revealed_events AS (
    SELECT e.id AS event_id, e.episode_number
    FROM events e
    JOIN visible_episodes ve ON ve.episode_number = e.episode_number
    WHERE e.show_id = p_show_id
      AND (
        ve.active_from_datetime IS NULL 
        OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
      )
  ),
  user_points AS (
    SELECT 
      su.id AS show_user_id,
      su.user_id,
      COALESCE(SUM(
        CASE 
          WHEN re.event_id IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points,
      COALESCE(SUM(
        CASE 
          WHEN ev.episode_number = v_active_episode_number
               AND re.event_id IS NOT NULL
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS gameweek_points
    FROM show_users su
    LEFT JOIN user_teams ut ON ut.user_id = su.user_id AND ut.show_id = p_show_id
    LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = p_show_id
    LEFT JOIN revealed_events re ON re.event_id = ev.id
    WHERE su.show_id = p_show_id
    GROUP BY su.id, su.user_id
  ),
  user_team_size AS (
    SELECT 
      su.user_id AS uts_user_id,
      COUNT(ut.id)::BIGINT AS team_size
    FROM show_users su
    LEFT JOIN user_teams ut ON ut.user_id = su.user_id 
      AND ut.show_id = p_show_id 
      AND ut.removed_episode IS NULL
    WHERE su.show_id = p_show_id
    GROUP BY su.user_id
  )
  SELECT 
    su.id,
    su.user_id,
    su.username,
    su.email,
    su.avatar_url,
    su.gender,
    su.joined_at,
    COALESCE(up.total_points, 0)::BIGINT,
    COALESCE(up.gameweek_points, 0)::BIGINT,
    COALESCE(uts.team_size, 0)::BIGINT
  FROM show_users su
  LEFT JOIN user_points up ON up.show_user_id = su.id
  LEFT JOIN user_team_size uts ON uts.uts_user_id = su.user_id
  WHERE su.show_id = p_show_id
  ORDER BY up.total_points DESC NULLS LAST;
END;
$function$;

-- Update get_league_leaderboard to filter by event reveal time
CREATE OR REPLACE FUNCTION public.get_league_leaderboard(p_league_id uuid)
 RETURNS TABLE(member_id uuid, user_id uuid, show_user_id uuid, username text, avatar_url text, total_points bigint, gameweek_points bigint, team_size bigint, rank bigint, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_show_id UUID;
  v_active_episode public.episodes;
  v_active_episode_number INTEGER;
BEGIN
  -- Get show_id from league
  SELECT l.show_id INTO v_show_id
  FROM leagues l
  WHERE l.id = p_league_id;
  
  IF v_show_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get current active episode
  v_active_episode := public.get_current_active_episode(v_show_id);
  v_active_episode_number := v_active_episode.episode_number;
  
  RETURN QUERY
  WITH visible_episodes AS (
    SELECT ep.episode_number, ep.active_from_datetime
    FROM episodes ep
    WHERE ep.show_id = v_show_id
      AND (ep.is_active = true OR (ep.active_from_datetime IS NOT NULL AND ep.active_from_datetime <= now()))
  ),
  revealed_events AS (
    SELECT e.id AS event_id, e.episode_number
    FROM events e
    JOIN visible_episodes ve ON ve.episode_number = e.episode_number
    WHERE e.show_id = v_show_id
      AND (
        ve.active_from_datetime IS NULL 
        OR ve.active_from_datetime + (COALESCE(e.event_offset_minutes, 0) || ' minutes')::interval <= now()
      )
  ),
  member_points AS (
    SELECT 
      lm.id AS member_id,
      lm.user_id,
      lm.show_user_id,
      lm.joined_at,
      COALESCE(SUM(
        CASE 
          WHEN re.event_id IS NOT NULL 
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS total_points,
      COALESCE(SUM(
        CASE 
          WHEN ev.episode_number = v_active_episode_number
               AND re.event_id IS NOT NULL
               AND ut.added_episode <= ev.episode_number 
               AND (ut.removed_episode IS NULL OR ut.removed_episode > ev.episode_number)
          THEN ep.points_awarded 
          ELSE 0 
        END
      ), 0)::BIGINT AS gameweek_points
    FROM league_members lm
    LEFT JOIN user_teams ut ON ut.user_id = lm.user_id AND ut.show_id = v_show_id
    LEFT JOIN event_participants ep ON ep.participant_id = ut.participant_id
    LEFT JOIN events ev ON ev.id = ep.event_id AND ev.show_id = v_show_id
    LEFT JOIN revealed_events re ON re.event_id = ev.id
    WHERE lm.league_id = p_league_id
    GROUP BY lm.id, lm.user_id, lm.show_user_id, lm.joined_at
  ),
  member_team_size AS (
    SELECT 
      lm.user_id AS mts_user_id,
      COUNT(ut.id)::BIGINT AS team_size
    FROM league_members lm
    LEFT JOIN user_teams ut ON ut.user_id = lm.user_id 
      AND ut.show_id = v_show_id 
      AND ut.removed_episode IS NULL
    WHERE lm.league_id = p_league_id
    GROUP BY lm.user_id
  )
  SELECT 
    mp.member_id,
    mp.user_id,
    mp.show_user_id,
    su.username,
    su.avatar_url,
    mp.total_points,
    mp.gameweek_points,
    COALESCE(mts.team_size, 0)::BIGINT AS team_size,
    RANK() OVER (ORDER BY mp.total_points DESC)::BIGINT AS rank,
    mp.joined_at
  FROM member_points mp
  JOIN show_users su ON su.id = mp.show_user_id
  LEFT JOIN member_team_size mts ON mts.mts_user_id = mp.user_id
  ORDER BY mp.total_points DESC;
END;
$function$;