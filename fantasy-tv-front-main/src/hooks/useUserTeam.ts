import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

export interface TeamMember {
  id: string;
  participant: Participant;
  slotPosition: number;
  addedEpisode: number;
  totalPoints: number;
  gameweekPoints: number;
}

interface UseUserTeamReturn {
  team: TeamMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addToTeam: (participantId: string, slotPosition: number, addedEpisode: number) => Promise<boolean>;
  removeFromTeam: (participantId: string) => Promise<boolean>;
}

export const useUserTeam = (showId: string | undefined, userId: string | undefined): UseUserTeamReturn => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTeam = useCallback(async () => {
    if (!showId || !userId) {
      setTeam([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch current team (where removed_episode IS NULL)
      const { data: teamData, error: teamError } = await supabase
        .from("user_teams")
        .select(`
          id,
          participant_id,
          slot_position,
          added_episode,
          participants (*)
        `)
        .eq("show_id", showId)
        .eq("user_id", userId)
        .is("removed_episode", null)
        .order("slot_position", { ascending: true });

      if (teamError) throw teamError;

      // Calculate points for each team member
      const teamWithPoints: TeamMember[] = await Promise.all(
        (teamData || []).map(async (item) => {
          // Get total points
          const { data: totalData } = await supabase.rpc("calculate_participant_points", {
            p_participant_id: item.participant_id,
            p_show_id: showId,
            p_episode_number: null,
          });

          // Get gameweek points (current active episode)
          const { data: activeEpisode } = await supabase.rpc("get_current_active_episode", {
            p_show_id: showId,
          });

          let gameweekPoints = 0;
          if (activeEpisode?.episode_number) {
            const { data: gwData } = await supabase.rpc("calculate_participant_points", {
              p_participant_id: item.participant_id,
              p_show_id: showId,
              p_episode_number: activeEpisode.episode_number,
            });
            gameweekPoints = gwData || 0;
          }

          return {
            id: item.id,
            participant: item.participants as Participant,
            slotPosition: item.slot_position,
            addedEpisode: item.added_episode,
            totalPoints: totalData || 0,
            gameweekPoints,
          };
        })
      );

      setTeam(teamWithPoints);
    } catch (err) {
      console.error("Error fetching team:", err);
      setError("Failed to load team");
    } finally {
      setIsLoading(false);
    }
  }, [showId, userId]);

  const addToTeam = useCallback(
    async (participantId: string, slotPosition: number, addedEpisode: number): Promise<boolean> => {
      if (!showId || !userId) return false;

      try {
        const { error } = await supabase.from("user_teams").insert({
          show_id: showId,
          user_id: userId,
          participant_id: participantId,
          slot_position: slotPosition,
          added_episode: addedEpisode,
        });

        if (error) throw error;

        await fetchTeam();
        return true;
      } catch (err) {
        console.error("Error adding to team:", err);
        toast({
          title: "Error",
          description: "Failed to add participant to team",
          variant: "destructive",
        });
        return false;
      }
    },
    [showId, userId, fetchTeam, toast]
  );

  const removeFromTeam = useCallback(
    async (participantId: string): Promise<boolean> => {
      if (!showId || !userId) return false;

      try {
        // Get current active episode
        const { data: activeEpisode } = await supabase.rpc("get_current_active_episode", {
          p_show_id: showId,
        });

        const { error } = await supabase
          .from("user_teams")
          .update({
            removed_episode: activeEpisode?.episode_number || 1,
            removed_at: new Date().toISOString(),
          })
          .eq("show_id", showId)
          .eq("user_id", userId)
          .eq("participant_id", participantId)
          .is("removed_episode", null);

        if (error) throw error;

        await fetchTeam();
        return true;
      } catch (err) {
        console.error("Error removing from team:", err);
        toast({
          title: "Error",
          description: "Failed to remove participant from team",
          variant: "destructive",
        });
        return false;
      }
    },
    [showId, userId, fetchTeam, toast]
  );

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Real-time subscription
  useEffect(() => {
    if (!showId || !userId) return;

    const channel = supabase
      .channel(`user-team-${showId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_teams",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          fetchTeam();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        () => {
          // Refetch to update points
          fetchTeam();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, userId, fetchTeam]);

  return {
    team,
    isLoading,
    error,
    refetch: fetchTeam,
    addToTeam,
    removeFromTeam,
  };
};
