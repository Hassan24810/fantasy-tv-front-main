import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseUserPointsReturn {
  totalPoints: number;
  gameweekPoints: number;
  rank: number;
  totalPlayers: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserPoints = (showId: string | undefined): UseUserPointsReturn => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameweekPoints, setGameweekPoints] = useState(0);
  const [rank, setRank] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoints = useCallback(async () => {
    if (!showId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setTotalPoints(0);
        setGameweekPoints(0);
        setRank(0);
        setTotalPlayers(0);
        setIsLoading(false);
        return;
      }

      // Get total points via RPC (membership-based calculation)
      const { data: totalData, error: totalError } = await supabase.rpc("calculate_user_total_points", {
        p_show_id: showId,
      });

      if (totalError) throw totalError;
      setTotalPoints(totalData || 0);

      // Get gameweek points via RPC (membership-based calculation)
      const { data: gwData, error: gwError } = await supabase.rpc("calculate_user_gameweek_points", {
        p_show_id: showId,
      });

      if (gwError) throw gwError;
      setGameweekPoints(gwData || 0);

      // Get global ranking using the new RPC (live-calculated, membership-based)
      const { data: rankings, error: rankingsError } = await supabase.rpc("get_show_global_ranking", {
        p_show_id: showId,
      });

      if (rankingsError) throw rankingsError;

      if (rankings && Array.isArray(rankings)) {
        setTotalPlayers(rankings.length);
        
        // Find current user's rank
        const userRanking = rankings.find((r: { user_id: string }) => r.user_id === user.id);
        if (userRanking) {
          setRank(Number(userRanking.rank) || rankings.length);
        } else {
          // User not found in rankings (shouldn't happen, but fallback to last)
          setRank(rankings.length + 1);
        }
      } else {
        setTotalPlayers(0);
        setRank(0);
      }
    } catch (err) {
      console.error("Error fetching points:", err);
      setError("Failed to load points");
    } finally {
      setIsLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  // Real-time subscription for points updates
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`user-points-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        () => {
          fetchPoints();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          fetchPoints();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "episodes",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          // Episode activation affects which events count for points
          fetchPoints();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_teams",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          // Team changes affect points
          fetchPoints();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "show_users",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          // New users affect rank
          fetchPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, fetchPoints]);

  return {
    totalPoints,
    gameweekPoints,
    rank,
    totalPlayers,
    isLoading,
    error,
    refetch: fetchPoints,
  };
};
