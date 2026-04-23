import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { toast } from "sonner";

export interface EventParticipant {
  id: string;
  participant_id: string;
  participant_name: string;
  points_awarded: number;
  participant_position: number;
}

export interface Event {
  id: string;
  show_id: string;
  episode_number: number;
  episode_name: string;
  rule_id: string | null;
  rule_name: string | null;
  rule_points: number | null;
  points_awarded: number;
  event_date: string | null;
  notes: string | null;
  created_at: string;
  participants: EventParticipant[];
  event_text: string;
}

export interface CreateEventData {
  episode_number: number;
  rule_id: string;
  participant_ids: string[];
  event_date?: string;
  event_offset_seconds?: number;
  notes?: string;
}

export function useEvents() {
  const { show } = useAdminShow();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["events", show?.id],
    queryFn: async () => {
      if (!show?.id) return [];

      // Fetch events with joins
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          show_id,
          episode_number,
          rule_id,
          points_awarded,
          event_date,
          notes,
          created_at
        `)
        .eq("show_id", show.id)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;
      if (!eventsData || eventsData.length === 0) return [];

      // Fetch related data
      const eventIds = eventsData.map(e => e.id);
      const ruleIds = [...new Set(eventsData.map(e => e.rule_id).filter(Boolean))];
      const episodeNumbers = [...new Set(eventsData.map(e => e.episode_number))];

      // Parallel fetches
      const [episodesResult, rulesResult, eventParticipantsResult] = await Promise.all([
        supabase
          .from("episodes")
          .select("episode_number, episode_name")
          .eq("show_id", show.id)
          .in("episode_number", episodeNumbers),
        ruleIds.length > 0
          ? supabase
              .from("game_rules")
              .select("id, event_name, points")
              .in("id", ruleIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("event_participants")
          .select("id, event_id, participant_id, points_awarded, participant_position")
          .in("event_id", eventIds),
      ]);

      if (episodesResult.error) throw episodesResult.error;
      if (rulesResult.error) throw rulesResult.error;
      if (eventParticipantsResult.error) throw eventParticipantsResult.error;

      // Get participant names
      const participantIds = [...new Set(eventParticipantsResult.data?.map(ep => ep.participant_id) || [])];
      const { data: participantsData, error: participantsError } = participantIds.length > 0
        ? await supabase
            .from("participants")
            .select("id, name")
            .in("id", participantIds)
        : { data: [], error: null };

      if (participantsError) throw participantsError;

      // Create lookup maps
      const episodesMap = new Map(
        (episodesResult.data || []).map(e => [e.episode_number, e.episode_name])
      );
      const rulesMap = new Map(
        (rulesResult.data || []).map(r => [r.id, { name: r.event_name, points: r.points }])
      );
      const participantsMap = new Map(
        (participantsData || []).map(p => [p.id, p.name])
      );

      // Group event_participants by event_id
      const eventParticipantsMap = new Map<string, EventParticipant[]>();
      for (const ep of eventParticipantsResult.data || []) {
        const list = eventParticipantsMap.get(ep.event_id) || [];
        list.push({
          id: ep.id,
          participant_id: ep.participant_id,
          participant_name: participantsMap.get(ep.participant_id) || "Unknown",
          points_awarded: ep.points_awarded,
          participant_position: ep.participant_position || 1,
        });
        eventParticipantsMap.set(ep.event_id, list);
      }

      // Build final events array
      return eventsData.map((e): Event => {
        const rule = e.rule_id ? rulesMap.get(e.rule_id) : null;
        const participants = eventParticipantsMap.get(e.id) || [];
        
        // Generate event text from participants and rule
        const participantNames = participants
          .sort((a, b) => a.participant_position - b.participant_position)
          .map(p => `${p.participant_name} (${p.points_awarded >= 0 ? '+' : ''}${p.points_awarded} pts)`)
          .join(", ");
        
        const eventText = rule?.name 
          ? `${rule.name}: ${participantNames}`
          : participantNames;

        return {
          id: e.id,
          show_id: e.show_id,
          episode_number: e.episode_number,
          episode_name: episodesMap.get(e.episode_number) || `Episode ${e.episode_number}`,
          rule_id: e.rule_id,
          rule_name: rule?.name || null,
          rule_points: rule?.points || null,
          points_awarded: e.points_awarded,
          event_date: e.event_date,
          notes: e.notes,
          created_at: e.created_at,
          participants,
          event_text: eventText,
        };
      });
    },
    enabled: !!show?.id,
  });

  const createEvent = useMutation({
    mutationFn: async (data: CreateEventData) => {
      if (!show?.id) throw new Error("No show selected");

      const { data: result, error } = await supabase.rpc("create_event_with_participants", {
        p_show_id: show.id,
        p_episode_number: data.episode_number,
        p_rule_id: data.rule_id,
        p_participant_ids: data.participant_ids,
        p_event_date: data.event_date || null,
        p_notes: data.notes || null,
        p_event_offset_seconds: data.event_offset_seconds || 0,
      });

      if (error) throw error;
      
      const response = result as { success: boolean; error?: string; event_id?: string };
      if (!response.success) {
        throw new Error(response.error || "Failed to create event");
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", show?.id] });
      queryClient.invalidateQueries({ queryKey: ["episodes", show?.id] });
      toast.success("Event created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create event: " + error.message);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      // Delete event_participants first
      const { error: epError } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId);

      if (epError) throw epError;

      // Delete the event
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", show?.id] });
      queryClient.invalidateQueries({ queryKey: ["episodes", show?.id] });
      toast.success("Event deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete event: " + error.message);
    },
  });

  return {
    events,
    isLoading,
    error,
    refetch,
    createEvent,
    deleteEvent,
  };
}
