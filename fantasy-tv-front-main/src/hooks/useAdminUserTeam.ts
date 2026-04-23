import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminTeamMember {
  team_member_id: string;
  participant_id: string;
  participant_name: string;
  participant_photo_url: string | null;
  slot_position: number;
  added_episode: number;
  removed_episode: number | null;
  total_points: number;
  gameweek_points: number;
}

interface UseAdminUserTeamReturn {
  team: AdminTeamMember[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminUserTeam(
  showId: string | undefined,
  userId: string | undefined,
  episodeNumber?: number
): UseAdminUserTeamReturn {
  const [team, setTeam] = useState<AdminTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!showId || !userId) {
      setTeam([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("admin_get_user_team", {
        p_show_id: showId,
        p_user_id: userId,
        p_episode_number: episodeNumber || null,
      });

      if (rpcError) throw rpcError;

      setTeam(
        (data || []).map((m: any) => ({
          team_member_id: m.team_member_id,
          participant_id: m.participant_id,
          participant_name: m.participant_name,
          participant_photo_url: m.participant_photo_url,
          slot_position: m.slot_position,
          added_episode: m.added_episode,
          removed_episode: m.removed_episode,
          total_points: Number(m.total_points),
          gameweek_points: Number(m.gameweek_points),
        }))
      );
    } catch (err) {
      console.error("Error fetching user team:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [showId, userId, episodeNumber]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return {
    team,
    isLoading,
    error,
    refetch: fetchTeam,
  };
}
