import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface League {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  isPublic: boolean;
  maxMembers: number | null;
  createdAt: string;
  usersInLeague: number;
  totalPoints: number;
  gwPoints: number;
}

interface UseLeaguesProps {
  showId: string | undefined;
}

export function useLeagues({ showId }: UseLeaguesProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeagues = useCallback(async () => {
    if (!showId) {
      setLeagues([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Use RPC to get leagues with accurate member counts
    const { data, error } = await supabase.rpc("get_leagues_with_stats", {
      p_show_id: showId,
    });

    if (error) {
      console.error("Error fetching leagues:", error);
      toast({
        title: "Error",
        description: "Failed to load leagues.",
        variant: "destructive",
      });
      setLeagues([]);
    } else {
      setLeagues(
        ((data as any[]) || []).map((league) => ({
          id: league.id,
          name: league.name,
          description: league.description,
          inviteCode: league.invite_code,
          isPublic: league.is_public ?? true,
          maxMembers: league.max_members,
          createdAt: league.created_at,
          usersInLeague: Number(league.member_count) || 0,
          totalPoints: Number(league.total_league_points) || 0,
          gwPoints: Number(league.total_league_gw_points) || 0,
        }))
      );
    }
    setIsLoading(false);
  }, [showId]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeagues(), 300);
  }, [fetchLeagues]);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // Real-time subscriptions for leagues, league_members, events, and event_participants
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`b2b-leagues-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leagues",
          filter: `show_id=eq.${showId}`,
        },
        () => debouncedFetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_members",
          filter: `show_id=eq.${showId}`,
        },
        () => debouncedFetch()
      )
      // Subscribe to events changes for point updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `show_id=eq.${showId}`,
        },
        () => debouncedFetch()
      )
      // Subscribe to event_participants for point updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [showId, debouncedFetch]);

  const addLeague = async (league: { name: string; description?: string; isPublic?: boolean; maxMembers?: number }) => {
    if (!showId) return false;

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("leagues").insert({
      show_id: showId,
      name: league.name,
      description: league.description || null,
      is_public: league.isPublic ?? true,
      max_members: league.maxMembers || 100,
      invite_code: inviteCode,
    });

    if (error) {
      console.error("Error adding league:", error);
      toast({
        title: "Error",
        description: "Failed to add league.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Success", description: "League created." });
    await fetchLeagues();
    return true;
  };

  const updateLeague = async (id: string, updates: Partial<League>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;
    if (updates.maxMembers !== undefined) dbUpdates.max_members = updates.maxMembers;

    const { error } = await supabase.from("leagues").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating league:", error);
      toast({
        title: "Error",
        description: "Failed to update league.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Success", description: "League updated." });
    await fetchLeagues();
    return true;
  };

  const deleteLeague = async (id: string) => {
    const { error } = await supabase.from("leagues").delete().eq("id", id);

    if (error) {
      console.error("Error deleting league:", error);
      toast({
        title: "Error",
        description: "Failed to delete league.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Success", description: "League deleted." });
    await fetchLeagues();
    return true;
  };

  return { leagues, isLoading, addLeague, updateLeague, deleteLeague, refetch: fetchLeagues };
}
