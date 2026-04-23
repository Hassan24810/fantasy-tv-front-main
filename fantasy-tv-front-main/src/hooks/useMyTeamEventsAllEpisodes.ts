import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  participant_id: string;
  name: string;
  photo_url: string | null;
  slot_position: number;
}

interface EventParticipant {
  participant_id: string;
  name: string;
  photo_url: string | null;
  points: number;
  position: number;
  is_on_team: boolean;
}

interface MyTeamEvent {
  event_id: string;
  event_offset_minutes: number;
  rule_id: string;
  rule_name: string;
  rule_icon: string;
  rule_template: string | null;
  notes: string | null;
  user_points_earned: number;
  all_participants: EventParticipant[];
}

export interface MyTeamEpisodeData {
  episode_number: number;
  episode_id: string;
  episode_name: string;
  team_members: TeamMember[];
  events: MyTeamEvent[];
}

export const useMyTeamEventsAllEpisodes = (
  showId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["my-team-events-all-episodes", showId],
    queryFn: async () => {
      if (!showId) return [];

      const { data, error } = await supabase.rpc(
        "get_my_team_events_all_episodes" as any,
        {
          p_show_id: showId,
        }
      );

      if (error) {
        console.error("Error fetching my team events:", error);
        throw error;
      }

      return (data || []) as unknown as MyTeamEpisodeData[];
    },
    enabled: !!showId && enabled,
    refetchInterval: 30000, // Refetch every 30s for live updates
  });
};
