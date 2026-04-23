import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EpisodeTeamMember {
  participant_id: string;
  participant_name: string;
  photo_url: string | null;
  slot_position: number;
  added_episode: number;
  removed_episode: number | null;
}

export const useUserTeamForEpisode = (
  showId: string | undefined,
  episodeNumber: number | null
) => {
  return useQuery({
    queryKey: ["user-team-for-episode", showId, episodeNumber],
    queryFn: async () => {
      if (!showId || episodeNumber === null) return [];

      const { data, error } = await supabase.rpc("get_user_team_for_episode", {
        p_show_id: showId,
        p_episode_number: episodeNumber,
      });

      if (error) {
        console.error("Error fetching team for episode:", error);
        throw error;
      }

      return (data || []) as EpisodeTeamMember[];
    },
    enabled: !!showId && episodeNumber !== null,
  });
};
