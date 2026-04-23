import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ContributingParticipant {
  participant_id: string;
  participant_name: string;
  points_awarded: number;
  position: number;
}

export interface PointsEvent {
  event_id: string;
  episode_number: number;
  event_offset_minutes: number;
  rule_id: string;
  rule_name: string;
  rule_icon: string;
  rule_template: string;
  event_points_earned: number;
  contributing_participants: ContributingParticipant[];
  all_event_participants: ContributingParticipant[];
}

interface UseUserPointsBreakdownReturn {
  totalPoints: number;
  gameweekPoints: number;
  gameweekEpisodeNumber: number | null;
  events: PointsEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserPointsBreakdown = (showId: string | undefined): UseUserPointsBreakdownReturn => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameweekPoints, setGameweekPoints] = useState(0);
  const [gameweekEpisodeNumber, setGameweekEpisodeNumber] = useState<number | null>(null);
  const [events, setEvents] = useState<PointsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBreakdown = useCallback(async () => {
    if (!showId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("get_user_points_breakdown", {
        p_show_id: showId,
      });

      if (rpcError) throw rpcError;

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const result = data as unknown as {
          total_points: number;
          gameweek_points: number;
          gameweek_episode_number: number | null;
          events: PointsEvent[];
        };
        setTotalPoints(result.total_points || 0);
        setGameweekPoints(result.gameweek_points || 0);
        setGameweekEpisodeNumber(result.gameweek_episode_number);
        setEvents(result.events || []);
      }
    } catch (err) {
      console.error("Error fetching points breakdown:", err);
      setError("Failed to load points breakdown");
    } finally {
      setIsLoading(false);
    }
  }, [showId]);

  // Debounced refetch for realtime updates
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchBreakdown();
    }, 300);
  }, [fetchBreakdown]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  // Real-time subscription for points updates
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`user-points-breakdown-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        debouncedRefetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `show_id=eq.${showId}`,
        },
        debouncedRefetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "episodes",
          filter: `show_id=eq.${showId}`,
        },
        debouncedRefetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_teams",
          filter: `show_id=eq.${showId}`,
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [showId, debouncedRefetch]);

  return {
    totalPoints,
    gameweekPoints,
    gameweekEpisodeNumber,
    events,
    isLoading,
    error,
    refetch: fetchBreakdown,
  };
};
