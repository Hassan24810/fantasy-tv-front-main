import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18n from "@/i18n";

// Map RPC error codes to user-friendly messages
function mapErrorCode(errorCode: string | undefined, fallback?: string): string {
  switch (errorCode) {
    case "NOT_AUTHENTICATED":
      return i18n.t("leagues.errors.notAuthenticated");
    case "NOT_REGISTERED":
      return i18n.t("leagues.errors.notRegistered");
    case "INVALID_CODE":
      return i18n.t("leagues.errors.invalidCode");
    case "ALREADY_MEMBER":
      return i18n.t("leagues.errors.alreadyMember");
    case "LEAGUE_FULL":
      return i18n.t("leagues.errors.leagueFull");
    case "PRIVATE_LEAGUE":
      return i18n.t("leagues.errors.privateLeague");
    case "NOT_FOUND":
      return i18n.t("leagues.errors.notFound");
    case "NOT_MEMBER":
      return i18n.t("leagues.errors.notMember");
    case "INVALID_SHOW":
      return i18n.t("leagues.errors.invalidShow");
    case "NAME_EXISTS":
      return i18n.t("leagues.errors.nameExists");
    default:
      return fallback || i18n.t("leagues.errors.generic");
  }
}

// Map transport-level RPC errors
function mapRpcError(error: { message?: string; code?: string }): string {
  if (error.code === "42501") {
    return i18n.t("leagues.errors.permissionDenied");
  }
  if (error.code === "42883") {
    return i18n.t("leagues.errors.serviceUnavailable");
  }
  return error.message || i18n.t("leagues.errors.generic");
}

export interface B2CLeague {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  is_public: boolean;
  max_members: number | null;
  member_count: number;
  total_league_points: number;
  total_league_gw_points: number;
  created_at: string;
  user_rank?: number;
  leader_name?: string;
}

export interface LeagueMember {
  member_id: string;
  user_id: string;
  show_user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  gameweek_points: number;
  team_size: number;
  rank: number;
  joined_at: string;
}

interface UseB2CLeaguesReturn {
  userLeagues: B2CLeague[];
  publicLeagues: B2CLeague[];
  isLoading: boolean;
  error: Error | null;
  createLeague: (name: string, description?: string, isPublic?: boolean) => Promise<{ success: boolean; league_id?: string; invite_code?: string; error?: string; error_code?: string }>;
  joinByCode: (code: string) => Promise<{ success: boolean; league_id?: string; error?: string; error_code?: string }>;
  joinPublic: (leagueId: string) => Promise<{ success: boolean; error?: string; error_code?: string }>;
  leaveLeague: (leagueId: string) => Promise<{ success: boolean; error?: string; error_code?: string }>;
  getLeaderboard: (leagueId: string) => Promise<LeagueMember[]>;
  refetch: () => Promise<void>;
}

export function useB2CLeagues(showId: string | undefined, userId: string | undefined): UseB2CLeaguesReturn {
  const [userLeagues, setUserLeagues] = useState<B2CLeague[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<B2CLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeagues = useCallback(async () => {
    if (!showId || !userId) {
      setUserLeagues([]);
      setPublicLeagues([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1) Fetch user's leagues via RPC (single source of truth)
      // Cast to any to avoid type errors until types are regenerated
      const { data: userLeagueData, error: userLeagueError } = await (supabase.rpc as any)(
        "get_user_leagues_with_stats",
        { p_show_id: showId }
      );

      if (userLeagueError) throw userLeagueError;

      const userLeagueIds = new Set<string>();
      const userLeaguesWithRank: B2CLeague[] = [];

      for (const league of (userLeagueData as any[]) || []) {
        userLeagueIds.add(league.id);

        // Get user's rank and leader from leaderboard
        const { data: leaderboard } = await supabase.rpc("get_league_leaderboard", {
          p_league_id: league.id,
        });

        const userRank = leaderboard?.find((m: any) => m.user_id === userId)?.rank;
        const leader = leaderboard?.[0];

        userLeaguesWithRank.push({
          id: league.id,
          name: league.name,
          description: league.description,
          invite_code: league.invite_code,
          is_public: league.is_public ?? true,
          max_members: league.max_members,
          member_count: Number(league.member_count) || 0,
          total_league_points: Number(league.total_league_points) || 0,
          total_league_gw_points: Number(league.total_league_gw_points) || 0,
          created_at: league.created_at,
          user_rank: userRank ? Number(userRank) : undefined,
          leader_name: leader?.username,
        });
      }

      setUserLeagues(userLeaguesWithRank);

      // 2) Fetch public leagues user is NOT a member of
      const { data: allPublicData, error: publicError } = await supabase.rpc(
        "get_leagues_with_stats",
        { p_show_id: showId }
      );

      if (publicError) throw publicError;

      const publicLeaguesFiltered: B2CLeague[] = ((allPublicData as any[]) || [])
        .filter((l) => l.is_public && !userLeagueIds.has(l.id))
        .map((league) => ({
          id: league.id,
          name: league.name,
          description: league.description,
          invite_code: league.invite_code,
          is_public: true,
          max_members: league.max_members,
          member_count: Number(league.member_count) || 0,
          total_league_points: Number(league.total_league_points) || 0,
          total_league_gw_points: Number(league.total_league_gw_points) || 0,
          created_at: league.created_at,
        }));

      setPublicLeagues(publicLeaguesFiltered);
    } catch (err) {
      console.error("Error fetching leagues:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [showId, userId]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeagues(), 300);
  }, [fetchLeagues]);

  const createLeague = useCallback(async (
    name: string,
    description?: string,
    isPublic: boolean = true
  ) => {
    if (!showId) return { success: false, error: i18n.t("leagues.errors.noShow"), error_code: "NO_SHOW" };

    const { data, error } = await supabase.rpc("create_league_with_membership", {
      p_show_id: showId,
      p_name: name,
      p_description: description || null,
      p_is_public: isPublic,
    });

    if (error) {
      console.error("Create league RPC error:", error.message, error.code, error.details, error.hint);
      const errorMsg = mapRpcError(error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: error.code };
    }

    const result = data as any;
    if (!result.success) {
      const errorMsg = mapErrorCode(result.error_code, result.error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: result.error_code };
    }

    toast.success(i18n.t("toast.leagueCreated"));
    await fetchLeagues();
    return {
      success: true,
      league_id: result.league_id,
      invite_code: result.invite_code,
    };
  }, [showId, fetchLeagues]);

  const joinByCode = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc("join_league_by_code", {
      p_invite_code: code,
    });

    if (error) {
      console.error("Join by code RPC error:", error.message, error.code, error.details, error.hint);
      const errorMsg = mapRpcError(error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: error.code };
    }

    const result = data as any;
    if (!result.success) {
      const errorMsg = mapErrorCode(result.error_code, result.error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: result.error_code };
    }

    toast.success(i18n.t("leagues.joinedLeague", { name: result.league_name }));
    await fetchLeagues();
    return { success: true, league_id: result.league_id };
  }, [fetchLeagues]);

  const joinPublic = useCallback(async (leagueId: string) => {
    const { data, error } = await supabase.rpc("join_league_public", {
      p_league_id: leagueId,
    });

    if (error) {
      console.error("Join public RPC error:", error.message, error.code, error.details, error.hint);
      const errorMsg = mapRpcError(error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: error.code };
    }

    const result = data as any;
    if (!result.success) {
      const errorMsg = mapErrorCode(result.error_code, result.error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: result.error_code };
    }

    toast.success(i18n.t("leagues.joinedLeague", { name: result.league_name }));
    await fetchLeagues();
    return { success: true };
  }, [fetchLeagues]);

  const leaveLeague = useCallback(async (leagueId: string) => {
    const { data, error } = await supabase.rpc("leave_league", {
      p_league_id: leagueId,
    });

    if (error) {
      console.error("Leave league RPC error:", error.message, error.code, error.details, error.hint);
      const errorMsg = mapRpcError(error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: error.code };
    }

    const result = data as any;
    if (!result.success) {
      const errorMsg = mapErrorCode(result.error_code, result.error);
      toast.error(errorMsg);
      return { success: false, error: errorMsg, error_code: result.error_code };
    }

    toast.success(i18n.t("toast.leagueLeft"));
    await fetchLeagues();
    return { success: true };
  }, [fetchLeagues]);

  const getLeaderboard = useCallback(async (leagueId: string): Promise<LeagueMember[]> => {
    const { data, error } = await supabase.rpc("get_league_leaderboard", {
      p_league_id: leagueId,
    });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }

    return ((data as any[]) || []).map((m) => ({
      member_id: m.member_id,
      user_id: m.user_id,
      show_user_id: m.show_user_id,
      username: m.username,
      avatar_url: m.avatar_url,
      total_points: Number(m.total_points),
      gameweek_points: Number(m.gameweek_points),
      team_size: Number(m.team_size),
      rank: Number(m.rank),
      joined_at: m.joined_at,
    }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // Real-time subscriptions (show-scoped)
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`b2c-leagues-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leagues",
          filter: `show_id=eq.${showId}`,
        },
        () => debouncedFetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_members",
          filter: `show_id=eq.${showId}`,
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [showId, debouncedFetch]);

  return {
    userLeagues,
    publicLeagues,
    isLoading,
    error,
    createLeague,
    joinByCode,
    joinPublic,
    leaveLeague,
    getLeaderboard,
    refetch: fetchLeagues,
  };
}
