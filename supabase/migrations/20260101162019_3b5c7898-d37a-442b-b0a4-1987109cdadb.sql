-- Update get_leagues_with_stats to calculate points live via get_league_leaderboard
CREATE OR REPLACE FUNCTION public.get_leagues_with_stats(p_show_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'description', l.description,
      'invite_code', l.invite_code,
      'is_public', l.is_public,
      'max_members', l.max_members,
      'member_count', stats.member_count,
      'total_league_points', COALESCE(stats.total_league_points, 0),
      'total_league_gw_points', COALESCE(stats.total_league_gw_points, 0),
      'created_at', l.created_at
    ) ORDER BY stats.member_count DESC, l.created_at DESC
  ), '[]'::jsonb) INTO v_result
  FROM public.leagues l
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::int as member_count,
      COALESCE(SUM(lb.total_points), 0)::bigint as total_league_points,
      COALESCE(SUM(lb.gameweek_points), 0)::bigint as total_league_gw_points
    FROM public.get_league_leaderboard(l.id) lb
  ) stats ON true
  WHERE l.show_id = p_show_id;

  RETURN v_result;
END;
$function$;

-- Update get_user_leagues_with_stats to calculate points live via get_league_leaderboard
CREATE OR REPLACE FUNCTION public.get_user_leagues_with_stats(p_show_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_show_user_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_show_user_id
  FROM public.show_users
  WHERE show_id = p_show_id AND user_id = v_user_id;

  IF v_show_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'description', l.description,
      'invite_code', l.invite_code,
      'is_public', l.is_public,
      'max_members', l.max_members,
      'member_count', stats.member_count,
      'total_league_points', COALESCE(stats.total_league_points, 0),
      'total_league_gw_points', COALESCE(stats.total_league_gw_points, 0),
      'created_at', l.created_at
    ) ORDER BY l.created_at DESC
  ), '[]'::jsonb) INTO v_result
  FROM public.leagues l
  INNER JOIN public.league_members lm ON lm.league_id = l.id AND lm.show_user_id = v_show_user_id
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::int as member_count,
      COALESCE(SUM(lb.total_points), 0)::bigint as total_league_points,
      COALESCE(SUM(lb.gameweek_points), 0)::bigint as total_league_gw_points
    FROM public.get_league_leaderboard(l.id) lb
  ) stats ON true
  WHERE l.show_id = p_show_id;

  RETURN v_result;
END;
$function$;