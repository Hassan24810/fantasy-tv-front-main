-- ============================================
-- PHASE 1: CREATE NEW TABLES
-- ============================================

-- 1.1 Create event_participants join table (multi-participant events)
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  participant_position INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, participant_id)
);

-- 1.2 Create user_teams table with history tracking
CREATE TABLE public.user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  slot_position INTEGER NOT NULL DEFAULT 1,
  added_episode INTEGER NOT NULL DEFAULT 1,
  removed_episode INTEGER,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Create transfers table
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_out_id UUID NOT NULL REFERENCES public.participants(id),
  participant_in_id UUID NOT NULL REFERENCES public.participants(id),
  transfer_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Create league_members join table
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  show_user_id UUID NOT NULL REFERENCES public.show_users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- ============================================
-- PHASE 2: ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================

-- 2.1 Add active_until_datetime to episodes (for locked during live)
ALTER TABLE public.episodes 
ADD COLUMN IF NOT EXISTS active_until_datetime TIMESTAMPTZ;

-- 2.2 Add participant media fields
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'show',
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- PHASE 3: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 4: RLS POLICIES FOR event_participants
-- ============================================

-- Public read for active shows (matches events table)
CREATE POLICY "Event participants are publicly readable for active shows"
ON public.event_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.shows s ON s.id = e.show_id
    WHERE e.id = event_participants.event_id 
    AND s.status = 'active'
  )
);

-- Show owners can manage
CREATE POLICY "Show owners can insert event_participants"
ON public.event_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.shows s ON s.id = e.show_id
    WHERE e.id = event_participants.event_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Show owners can update event_participants"
ON public.event_participants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.shows s ON s.id = e.show_id
    WHERE e.id = event_participants.event_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Show owners can delete event_participants"
ON public.event_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.shows s ON s.id = e.show_id
    WHERE e.id = event_participants.event_id 
    AND s.user_id = auth.uid()
  )
);

-- ============================================
-- PHASE 5: RLS POLICIES FOR user_teams
-- ============================================

-- Users can view their own teams
CREATE POLICY "Users can view their own teams"
ON public.user_teams FOR SELECT
USING (auth.uid() = user_id);

-- Show owners can view all teams for their shows
CREATE POLICY "Show owners can view all teams"
ON public.user_teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = user_teams.show_id AND user_id = auth.uid()
  )
);

-- Users can insert their own teams for active shows
CREATE POLICY "Users can insert their own teams"
ON public.user_teams FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = user_teams.show_id AND status = 'active'
  )
);

-- Users can update their own teams
CREATE POLICY "Users can update their own teams"
ON public.user_teams FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own teams
CREATE POLICY "Users can delete their own teams"
ON public.user_teams FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- PHASE 6: RLS POLICIES FOR transfers
-- ============================================

-- Users can view their own transfers
CREATE POLICY "Users can view their own transfers"
ON public.transfers FOR SELECT
USING (auth.uid() = user_id);

-- Show owners can view all transfers
CREATE POLICY "Show owners can view all transfers"
ON public.transfers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = transfers.show_id AND user_id = auth.uid()
  )
);

-- Users can insert their own transfers for active shows
CREATE POLICY "Users can insert their own transfers"
ON public.transfers FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = transfers.show_id AND status = 'active'
  )
);

-- ============================================
-- PHASE 7: RLS POLICIES FOR league_members
-- ============================================

-- League members can see other members
CREATE POLICY "League members can view each other"
ON public.league_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members lm
    WHERE lm.league_id = league_members.league_id 
    AND lm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.leagues l
    JOIN public.shows s ON s.id = l.show_id
    WHERE l.id = league_members.league_id AND s.user_id = auth.uid()
  )
);

-- Users can join leagues for active shows
CREATE POLICY "Users can join leagues"
ON public.league_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.leagues l
    JOIN public.shows s ON s.id = l.show_id
    WHERE l.id = league_members.league_id AND s.status = 'active'
  )
);

-- Users can leave leagues
CREATE POLICY "Users can leave leagues"
ON public.league_members FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- PHASE 8: FIX show_users RLS FOR B2C REGISTRATION
-- ============================================

-- Allow authenticated users to insert their own show_user for active shows
CREATE POLICY "Users can register for active shows"
ON public.show_users FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = show_users.show_id AND status = 'active'
  )
);

-- Users can view their own show_user record
CREATE POLICY "Users can view their own show_user"
ON public.show_users FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own show_user record
CREATE POLICY "Users can update their own show_user"
ON public.show_users FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- PHASE 9: ENABLE REAL-TIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.episodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.branding_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leagues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.show_users;

-- ============================================
-- PHASE 10: HELPER FUNCTIONS
-- ============================================

-- Function to get current active episode for a show
CREATE OR REPLACE FUNCTION public.get_current_active_episode(p_show_id UUID)
RETURNS public.episodes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.episodes
  WHERE show_id = p_show_id
    AND (is_active = true OR (active_from_datetime IS NOT NULL AND active_from_datetime <= now()))
  ORDER BY episode_number DESC
  LIMIT 1;
$$;

-- Function to get reset period based on frequency
CREATE OR REPLACE FUNCTION public.get_current_reset_period(p_show_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_frequency TEXT;
  v_active_episode public.episodes;
  v_week_num TEXT;
  v_month TEXT;
BEGIN
  -- Get transfer reset frequency from game_settings
  SELECT transfer_reset_frequency INTO v_frequency
  FROM public.game_settings
  WHERE show_id = p_show_id;

  IF v_frequency IS NULL THEN
    v_frequency := 'weekly';
  END IF;

  CASE v_frequency
    WHEN 'per_episode' THEN
      v_active_episode := public.get_current_active_episode(p_show_id);
      IF v_active_episode IS NULL THEN
        RETURN 'EP-1';
      END IF;
      RETURN 'EP-' || v_active_episode.episode_number;
    WHEN 'weekly' THEN
      v_week_num := to_char(now(), 'IYYY-"W"IW');
      RETURN v_week_num;
    WHEN 'monthly' THEN
      v_month := to_char(now(), 'YYYY-MM');
      RETURN v_month;
    ELSE
      RETURN 'UNLIMITED';
  END CASE;
END;
$$;

-- ============================================
-- PHASE 11: POINTS CALCULATION FUNCTIONS
-- ============================================

-- Calculate participant points (total or for specific episode)
CREATE OR REPLACE FUNCTION public.calculate_participant_points(
  p_participant_id UUID,
  p_show_id UUID,
  p_episode_number INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND (p_episode_number IS NULL OR e.episode_number = p_episode_number);

  RETURN v_total_points;
END;
$$;

-- Calculate user total points (respecting team membership intervals)
CREATE OR REPLACE FUNCTION public.calculate_user_total_points(p_show_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_total_points INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Sum points from event_participants where participant was on user's team during that episode
  SELECT COALESCE(SUM(ep.points_awarded), 0) INTO v_total_points
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.episodes epi ON epi.show_id = e.show_id AND epi.episode_number = e.episode_number
  JOIN public.user_teams ut ON ut.participant_id = ep.participant_id AND ut.show_id = e.show_id AND ut.user_id = v_user_id
  WHERE e.show_id = p_show_id
    AND (epi.is_active = true OR (epi.active_from_datetime IS NOT NULL AND epi.active_from_datetime <= now()))
    AND ut.added_episode <= e.episode_number
    AND (ut.removed_episode IS NULL OR ut.removed_episode > e.episode_number);

  RETURN v_total_points;
END;
$$;

-- Calculate user gameweek (current episode) points
CREATE OR REPLACE FUNCTION public.calculate_user_gameweek_points(p_show_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND ut.added_episode <= e.episode_number
    AND (ut.removed_episode IS NULL OR ut.removed_episode > e.episode_number);

  RETURN v_gw_points;
END;
$$;

-- ============================================
-- PHASE 12: TRANSFER VALIDATION FUNCTIONS
-- ============================================

-- Get next transfer time
CREATE OR REPLACE FUNCTION public.get_next_transfer_time(p_show_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Check transfer window mode
  CASE v_settings.transfer_window_mode
    WHEN 'locked_during_live' THEN
      IF v_active_episode IS NOT NULL 
         AND v_active_episode.is_active = true 
         AND (v_active_episode.active_until_datetime IS NULL OR v_active_episode.active_until_datetime > now()) THEN
        v_can_transfer := false;
        v_reason := 'Episode is live - transfers locked';
        v_next_allowed := COALESCE(v_active_episode.active_until_datetime, now() + interval '2 hours');
      END IF;
    WHEN 'time_window' THEN
      -- Check if current time is within any transfer window
      -- transfer_windows is a JSONB array like [{"start": "09:00", "end": "21:00", "days": ["Mon", "Tue"]}]
      -- Simplified: assume window is closed if not in window
      v_can_transfer := true; -- Would need more complex logic for time windows
    ELSE
      -- 'always_open' or default
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
      WHEN 'weekly' THEN
        v_next_allowed := date_trunc('week', now()) + interval '1 week';
      WHEN 'monthly' THEN
        v_next_allowed := date_trunc('month', now()) + interval '1 month';
      ELSE
        v_next_allowed := now();
    END CASE;
  END IF;

  -- Check lock_roster_after_episode
  IF v_can_transfer AND v_settings.lock_roster_after_episode = true AND v_active_episode IS NOT NULL THEN
    IF v_active_episode.is_active = true THEN
      v_can_transfer := false;
      v_reason := 'Roster locked during active episode';
      v_next_allowed := COALESCE(v_active_episode.active_until_datetime, now() + interval '2 hours');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'can_transfer', v_can_transfer,
    'reason', v_reason,
    'next_allowed_datetime', v_next_allowed,
    'transfers_remaining', GREATEST(0, v_settings.transfers_per_reset - v_transfers_used),
    'reset_period', v_reset_period
  );
END;
$$;

-- Validate team constraints
CREATE OR REPLACE FUNCTION public.validate_team_constraints(
  p_show_id UUID,
  p_participant_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.game_settings;
  v_team_size INTEGER;
  v_boys_count INTEGER := 0;
  v_girls_count INTEGER := 0;
  v_participant RECORD;
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

  -- Count boys and girls (assuming we have a way to determine gender)
  -- For now, we'll check participant data or default gender field
  FOR v_participant IN
    SELECT p.* FROM public.participants p
    WHERE p.id = ANY(p_participant_ids)
  LOOP
    -- This is a simplified check - you may need to add a gender field to participants
    -- For now, assume all pass
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

-- Validate and execute transfer (HARD BLOCK - uses auth.uid() internally)
CREATE OR REPLACE FUNCTION public.validate_and_execute_transfer(
  p_show_id UUID,
  p_participant_out_id UUID,
  p_participant_in_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================
-- PHASE 13: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_participant_id ON public.event_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_show_user ON public.user_teams(show_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_active ON public.user_teams(show_id, user_id) WHERE removed_episode IS NULL;
CREATE INDEX IF NOT EXISTS idx_transfers_show_user_period ON public.transfers(show_id, user_id, reset_period);
CREATE INDEX IF NOT EXISTS idx_league_members_league ON public.league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON public.league_members(user_id);