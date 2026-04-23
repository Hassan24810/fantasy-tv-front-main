import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Episode {
  id: string;
  episodeNumber: number;
  episodeName: string;
  isActive: boolean;
  activeFromDateTime: string | null;
  activeUntilDateTime: string | null;
  durationSeconds: number;
  eventsCount: number;
  createdAt: string;
}

interface UseEpisodesProps {
  showId: string | undefined;
}

export function useEpisodes({ showId }: UseEpisodesProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEpisodes = useCallback(async () => {
    if (!showId) {
      setEpisodes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", showId)
      .order("episode_number", { ascending: true });

    if (error) {
      console.error("Error fetching episodes:", error);
      toast({
        title: "Error",
        description: "Failed to load episodes.",
        variant: "destructive",
      });
      setEpisodes([]);
    } else {
      setEpisodes(
        (data || []).map((ep: any) => ({
          id: ep.id,
          episodeNumber: ep.episode_number,
          episodeName: ep.episode_name,
          isActive: ep.is_active,
          activeFromDateTime: ep.active_from_datetime,
          activeUntilDateTime: ep.active_until_datetime,
          durationSeconds: ep.episode_duration_seconds ?? (ep.episode_duration_minutes ? ep.episode_duration_minutes * 60 : 3600),
          eventsCount: ep.events_count,
          createdAt: ep.created_at,
        }))
      );
    }
    setIsLoading(false);
  }, [showId]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const addEpisode = async (episode: Omit<Episode, "id" | "createdAt" | "eventsCount" | "isActive">) => {
    if (!showId) return;

    // Calculate active_until_datetime from start + duration (in seconds)
    let activeUntilDateTime = episode.activeUntilDateTime;
    if (!activeUntilDateTime && episode.activeFromDateTime && episode.durationSeconds) {
      const startDate = new Date(episode.activeFromDateTime);
      activeUntilDateTime = new Date(startDate.getTime() + episode.durationSeconds * 1000).toISOString();
    }

    const { error } = await supabase.from("episodes").insert({
      show_id: showId,
      episode_number: episode.episodeNumber,
      episode_name: episode.episodeName,
      is_active: false, // Always false - activation is scheduled
      active_from_datetime: episode.activeFromDateTime,
      active_until_datetime: activeUntilDateTime,
      episode_duration_seconds: episode.durationSeconds || 3600,
      events_count: 0,
    });

    if (error) {
      console.error("Error adding episode:", error);
      toast({
        title: "Error",
        description: "Failed to add episode.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Success", description: "Episode created." });
    await fetchEpisodes();
    return true;
  };

  const updateEpisode = async (id: string, updates: Partial<Omit<Episode, "id" | "createdAt">>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.episodeNumber !== undefined) dbUpdates.episode_number = updates.episodeNumber;
    if (updates.episodeName !== undefined) dbUpdates.episode_name = updates.episodeName;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.activeFromDateTime !== undefined) dbUpdates.active_from_datetime = updates.activeFromDateTime;
    if (updates.activeUntilDateTime !== undefined) dbUpdates.active_until_datetime = updates.activeUntilDateTime;
    if (updates.durationSeconds !== undefined) dbUpdates.episode_duration_seconds = updates.durationSeconds;
    if (updates.eventsCount !== undefined) dbUpdates.events_count = updates.eventsCount;

    // Auto-calculate until time if start time and duration are provided (in seconds)
    if (updates.activeFromDateTime && updates.durationSeconds) {
      const startDate = new Date(updates.activeFromDateTime);
      dbUpdates.active_until_datetime = new Date(startDate.getTime() + updates.durationSeconds * 1000).toISOString();
    }

    const { error } = await supabase.from("episodes").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating episode:", error);
      toast({
        title: "Error",
        description: "Failed to update episode.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Success", description: "Episode updated." });
    await fetchEpisodes();
    return true;
  };

  const deleteEpisode = async (id: string) => {
    const { error } = await supabase.from("episodes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting episode:", error);
      toast({
        title: "Error",
        description: "Failed to delete episode.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Success", description: "Episode deleted." });
    await fetchEpisodes();
    return true;
  };

  return { episodes, isLoading, addEpisode, updateEpisode, deleteEpisode, refetch: fetchEpisodes };
}
