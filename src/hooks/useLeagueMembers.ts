import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LeagueMember {
  id: string;
  userId: string;
  showUserId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
  gameweekPoints: number;
  teamSize: number;
  rank: number;
  joinedAt: string;
}

interface UseLeagueMembersReturn {
  members: LeagueMember[];
  isLoading: boolean;
  error: string | null;
  joinLeague: (leagueId: string, inviteCode?: string) => Promise<boolean>;
  leaveLeague: (leagueId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useLeagueMembers = (leagueId: string | undefined, showId: string | undefined): UseLeagueMembersReturn => {
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    if (!leagueId || !showId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the RPC function to get live calculated points (same as B2C)
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .rpc("get_league_leaderboard", { p_league_id: leagueId });

      if (leaderboardError) {
        console.error("Leaderboard RPC error:", leaderboardError);
        throw leaderboardError;
      }

      // Transform RPC response to LeagueMember format
      const transformedMembers: LeagueMember[] = (leaderboardData || []).map((member: any) => ({
        id: member.member_id,
        userId: member.user_id,
        showUserId: member.show_user_id,
        username: member.username || "Unknown",
        avatarUrl: member.avatar_url || null,
        totalPoints: member.total_points || 0,
        gameweekPoints: member.gameweek_points || 0,
        teamSize: member.team_size || 0,
        rank: member.rank || 0,
        joinedAt: member.joined_at,
      }));

      setMembers(transformedMembers);
    } catch (err) {
      console.error("Error fetching league members:", err);
      setError("Failed to load league members");
    } finally {
      setIsLoading(false);
    }
  }, [leagueId, showId]);

  const joinLeague = useCallback(
    async (targetLeagueId: string, inviteCode?: string): Promise<boolean> => {
      if (!showId) return false;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Error",
            description: "You must be logged in to join a league",
            variant: "destructive",
          });
          return false;
        }

        // If invite code provided, verify it
        if (inviteCode) {
          const { data: league, error: leagueError } = await supabase
            .from("leagues")
            .select("id, invite_code, is_public")
            .eq("id", targetLeagueId)
            .single();

          if (leagueError) throw leagueError;

          if (!league.is_public && league.invite_code !== inviteCode) {
            toast({
              title: "Invalid invite code",
              description: "The invite code you entered is incorrect",
              variant: "destructive",
            });
            return false;
          }
        }

        // Get user's show_user record
        const { data: showUser, error: showUserError } = await supabase
          .from("show_users")
          .select("id")
          .eq("show_id", showId)
          .eq("user_id", user.id)
          .single();

        if (showUserError || !showUser) {
          toast({
            title: "Error",
            description: "You must be registered for this show to join a league",
            variant: "destructive",
          });
          return false;
        }

        // Join the league - include show_id for proper filtering
        const { error: joinError } = await supabase.from("league_members").insert({
          league_id: targetLeagueId,
          show_id: showId,
          show_user_id: showUser.id,
          user_id: user.id,
        });

        if (joinError) {
          if (joinError.code === "23505") {
            toast({
              title: "Already a member",
              description: "You are already a member of this league",
              variant: "destructive",
            });
          } else {
            throw joinError;
          }
          return false;
        }

        toast({
          title: "Success!",
          description: "You have joined the league",
        });

        await fetchMembers();
        return true;
      } catch (err) {
        console.error("Error joining league:", err);
        toast({
          title: "Error",
          description: "Failed to join league",
          variant: "destructive",
        });
        return false;
      }
    },
    [showId, fetchMembers, toast]
  );

  const leaveLeague = useCallback(
    async (targetLeagueId: string): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
          .from("league_members")
          .delete()
          .eq("league_id", targetLeagueId)
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Left league",
          description: "You have left the league",
        });

        await fetchMembers();
        return true;
      } catch (err) {
        console.error("Error leaving league:", err);
        toast({
          title: "Error",
          description: "Failed to leave league",
          variant: "destructive",
        });
        return false;
      }
    },
    [fetchMembers, toast]
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Real-time subscription with show_id filter for better performance
  useEffect(() => {
    if (!leagueId || !showId) return;

    const channel = supabase
      .channel(`league-members-${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_members",
          filter: `show_id=eq.${showId}`,
        },
        () => fetchMembers()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "show_users",
          filter: `show_id=eq.${showId}`,
        },
        () => fetchMembers()
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
        () => fetchMembers()
      )
      // Subscribe to event_participants for point updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, showId, fetchMembers]);

  return {
    members,
    isLoading,
    error,
    joinLeague,
    leaveLeague,
    refetch: fetchMembers,
  };
};
