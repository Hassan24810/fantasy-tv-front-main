import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParticipantPickCount {
  participant_id: string;
  participant_name: string;
  participant_photo_url: string | null;
  pick_count: number;
  pick_percentage: number;
  total_users: number;
}

interface UseParticipantPickCountsReturn {
  pickCounts: ParticipantPickCount[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useParticipantPickCounts(showId: string | undefined): UseParticipantPickCountsReturn {
  const [pickCounts, setPickCounts] = useState<ParticipantPickCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPickCounts = useCallback(async () => {
    if (!showId) {
      setPickCounts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("get_participant_pick_counts", {
        p_show_id: showId,
      });

      if (rpcError) throw rpcError;

      setPickCounts(
        (data || []).map((p: any) => ({
          participant_id: p.participant_id,
          participant_name: p.participant_name,
          participant_photo_url: p.participant_photo_url,
          pick_count: Number(p.pick_count),
          pick_percentage: Number(p.pick_percentage),
          total_users: Number(p.total_users),
        }))
      );
    } catch (err) {
      console.error("Error fetching pick counts:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [showId]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPickCounts(), 300);
  }, [fetchPickCounts]);

  useEffect(() => {
    fetchPickCounts();
  }, [fetchPickCounts]);

  // Real-time subscription for team changes
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`pick-counts-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_teams",
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
    pickCounts,
    isLoading,
    error,
    refetch: fetchPickCounts,
  };
}
