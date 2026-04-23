import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useCallback } from "react";

interface ParticipantInsight {
  participant_id: string;
  name: string;
  photo_url: string | null;
  owned_count?: number;
  owned_pct?: number;
  pool_size?: number;
  transfer_count?: number;
  last_gw_points: number;
}

export interface OverviewInsights {
  league_count: number;
  unique_member_count: number;
  total_points: number;
  most_owned: ParticipantInsight[];
  most_transferred_in: ParticipantInsight[];
  most_transferred_out: ParticipantInsight[];
}

export interface LeagueInsights {
  league_id: string;
  league_member_count: number;
  total_points: number;
  most_owned: ParticipantInsight[];
  most_transferred_in: ParticipantInsight[];
  most_transferred_out: ParticipantInsight[];
}

export type InsightsData = OverviewInsights | LeagueInsights;

export const useLeagueInsights = (
  showId: string | undefined,
  leagueId: string | null,
  lastGws: number = 3
) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey: ["league-insights", showId, leagueId, lastGws],
    queryFn: async () => {
      if (!showId) return null;

      if (leagueId) {
        // League detail mode
        const { data, error } = await supabase.rpc("get_league_insights", {
          p_league_id: leagueId,
          p_last_gws: lastGws,
        });
        if (error) throw error;
        return data as unknown as LeagueInsights;
      } else {
        // Overview mode
        const { data, error } = await supabase.rpc("get_my_leagues_insights", {
          p_show_id: showId,
          p_last_gws: lastGws,
        });
        if (error) throw error;
        return data as unknown as OverviewInsights;
      }
    },
    enabled: !!showId,
  });

  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["league-insights", showId, leagueId] });
    }, 300);
  }, [queryClient, showId, leagueId]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`league-insights-${showId}-${leagueId || "overview"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_members", filter: `show_id=eq.${showId}` }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_teams", filter: `show_id=eq.${showId}` }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "transfers", filter: `show_id=eq.${showId}` }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `show_id=eq.${showId}` }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_participants" }, debouncedRefetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [showId, leagueId, debouncedRefetch]);

  return query;
};
