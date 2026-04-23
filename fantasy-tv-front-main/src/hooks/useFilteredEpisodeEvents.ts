import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FilteredEventParticipant {
  participant_id: string;
  name: string;
  photo_url: string | null;
  points: number;
  position: number;
  is_on_team: boolean;
}

export interface FilteredEvent {
  event_id: string;
  event_offset_minutes: number;
  rule_id: string;
  rule_name: string;
  rule_icon: string | null;
  rule_template: string | null;
  notes: string | null;
  participants: FilteredEventParticipant[];
}

export const useFilteredEpisodeEvents = (
  showId: string | undefined,
  episodeNumber: number | null,
  onlyMyTeam: boolean = false
) => {
  return useQuery({
    queryKey: ["filtered-episode-events", showId, episodeNumber, onlyMyTeam],
    queryFn: async () => {
      if (!showId || episodeNumber === null) return [];

      const { data, error } = await supabase.rpc("get_episode_events_filtered", {
        p_show_id: showId,
        p_episode_number: episodeNumber,
        p_only_my_team: onlyMyTeam,
      });

      if (error) {
        console.error("Error fetching filtered events:", error);
        throw error;
      }

      // Parse participants JSON for each event
      return ((data || []) as any[]).map((event) => ({
        ...event,
        participants: typeof event.participants === "string" 
          ? JSON.parse(event.participants) 
          : event.participants,
      })) as FilteredEvent[];
    },
    enabled: !!showId && episodeNumber !== null,
  });
};
