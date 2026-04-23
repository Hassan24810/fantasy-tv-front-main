import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserLeague {
  id: string;
  name: string;
  isPublic: boolean;
  joinedAt: string;
  userTotalPoints: number;
  userGameweekPoints: number;
  userRank: number;
  memberCount: number;
  leagueTotalPoints: number;
  leagueGwPoints: number;
}

interface UseAdminUserLeaguesReturn {
  leagues: UserLeague[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAdminUserLeagues = (
  showId: string | undefined,
  userId: string | undefined
): UseAdminUserLeaguesReturn => {
  const [leagues, setLeagues] = useState<UserLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserLeagues = useCallback(async () => {
    if (!showId || !userId) {
      setLeagues([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get all leagues the user belongs to (filtered by show_id)
      const { data: memberships, error: membershipsError } = await supabase
        .from("league_members")
        .select(`
          id,
          joined_at,
          league_id,
          leagues (
            id,
            name,
            is_public
          )
        `)
        .eq("show_id", showId)
        .eq("user_id", userId);

      if (membershipsError) {
        console.error("Error fetching user league memberships:", membershipsError);
        throw membershipsError;
      }

      if (!memberships || memberships.length === 0) {
        setLeagues([]);
        setIsLoading(false);
        return;
      }

      // Step 2: For each league, get the leaderboard to find user's points and rank
      const leaguePromises = memberships.map(async (membership) => {
        const league = membership.leagues as any;
        if (!league) return null;

        try {
          const { data: leaderboardData, error: leaderboardError } = await supabase
            .rpc("get_league_leaderboard", { p_league_id: league.id });

          if (leaderboardError) {
            console.error(`Error fetching leaderboard for league ${league.id}:`, leaderboardError);
            return null;
          }

          // Find the user in the leaderboard
          const userEntry = (leaderboardData || []).find(
            (entry: any) => entry.user_id === userId
          );

          // Calculate league totals from all members
          const leagueTotalPoints = (leaderboardData || []).reduce(
            (sum: number, entry: any) => sum + (entry.total_points || 0), 0
          );
          const leagueGwPoints = (leaderboardData || []).reduce(
            (sum: number, entry: any) => sum + (entry.gameweek_points || 0), 0
          );

          const userLeague: UserLeague = {
            id: league.id,
            name: league.name,
            isPublic: league.is_public ?? true,
            joinedAt: membership.joined_at,
            userTotalPoints: userEntry?.total_points || 0,
            userGameweekPoints: userEntry?.gameweek_points || 0,
            userRank: userEntry?.rank || 0,
            memberCount: leaderboardData?.length || 0,
            leagueTotalPoints,
            leagueGwPoints,
          };

          return userLeague;
        } catch (err) {
          console.error(`Error processing league ${league.id}:`, err);
          return null;
        }
      });

      const resolvedLeagues = await Promise.all(leaguePromises);
      const validLeagues = resolvedLeagues.filter((l): l is UserLeague => l !== null);

      // Sort by joined date (newest first)
      validLeagues.sort((a, b) => 
        new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      );

      setLeagues(validLeagues);
    } catch (err) {
      console.error("Error fetching user leagues:", err);
      setError("Failed to load user leagues");
    } finally {
      setIsLoading(false);
    }
  }, [showId, userId]);

  useEffect(() => {
    fetchUserLeagues();
  }, [fetchUserLeagues]);

  return {
    leagues,
    isLoading,
    error,
    refetch: fetchUserLeagues,
  };
};
