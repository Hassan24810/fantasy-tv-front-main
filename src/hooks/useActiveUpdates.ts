import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ShowUpdate = Tables<"show_updates">;

export function useActiveUpdates(showId: string | undefined, limit = 5) {
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["active-updates", showId, limit],
    queryFn: async () => {
      if (!showId) return [];

      // RLS policy handles the active filtering (is_enabled, publish_at, expire_at)
      const { data, error } = await supabase
        .from("show_updates")
        .select("*")
        .eq("show_id", showId)
        .order("publish_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ShowUpdate[];
    },
    enabled: !!showId,
    refetchInterval: 60000, // Refetch every minute to check for newly published updates
  });

  return {
    updates,
    isLoading,
    hasUpdates: updates.length > 0,
  };
}
