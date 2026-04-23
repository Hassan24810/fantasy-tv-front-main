import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { startOfWeek, endOfWeek, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  leagues: number;
  totalParticipants: number;
}

export interface EventsPerDay {
  day: string;
  value: number;
}

export interface EventsPerParticipant {
  name: string;
  value: number;
  avatar?: string | null;
}

export interface UserPoints {
  name: string;
  gwPoints: number;
  totalPoints: number;
  avatar?: string | null;
}

export interface RecentEvent {
  id: string;
  number: number;
  name: string;
  description: string;
  points: number;
  participants: number;
}

export interface ActiveUsersData {
  day: number;
  value: number;
}

export function useDashboardData() {
  const { show } = useAdminShow();

  // Fetch basic stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", show?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!show?.id) return { totalUsers: 0, totalEvents: 0, leagues: 0, totalParticipants: 0 };

      const [eventsResult, participantsResult, leaguesResult, usersResult] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }).eq("show_id", show.id),
        supabase.from("participants").select("id", { count: "exact", head: true }).eq("show_id", show.id),
        supabase.from("leagues").select("id", { count: "exact", head: true }).eq("show_id", show.id),
        supabase.from("show_users").select("id", { count: "exact", head: true }).eq("show_id", show.id),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalEvents: eventsResult.count || 0,
        leagues: leaguesResult.count || 0,
        totalParticipants: participantsResult.count || 0,
      };
    },
    enabled: !!show?.id,
  });

  // Fetch previous month stats for comparison
  const { data: prevStats } = useQuery({
    queryKey: ["dashboard-prev-stats", show?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!show?.id) return { totalUsers: 0, totalEvents: 0, leagues: 0, totalParticipants: 0 };

      const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
      const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));

      const [usersResult, eventsResult] = await Promise.all([
        supabase.from("show_users").select("id", { count: "exact", head: true })
          .eq("show_id", show.id)
          .lte("joined_at", prevMonthEnd.toISOString()),
        supabase.from("events").select("id", { count: "exact", head: true })
          .eq("show_id", show.id)
          .lte("created_at", prevMonthEnd.toISOString()),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalEvents: eventsResult.count || 0,
        leagues: 0, // leagues don't typically need comparison
        totalParticipants: 0,
      };
    },
    enabled: !!show?.id,
  });

  // Fetch events per day (last 7 days)
  const { data: eventsPerDay, isLoading: eventsPerDayLoading } = useQuery({
    queryKey: ["dashboard-events-per-day", show?.id],
    queryFn: async (): Promise<EventsPerDay[]> => {
      if (!show?.id) return [];

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      const { data: events } = await supabase
        .from("events")
        .select("event_date")
        .eq("show_id", show.id)
        .gte("event_date", weekStart.toISOString())
        .lte("event_date", weekEnd.toISOString());

      const countsByDay: Record<string, number> = {};
      days.forEach(d => countsByDay[d] = 0);

      events?.forEach(event => {
        if (event.event_date) {
          const dayName = days[new Date(event.event_date).getDay()];
          countsByDay[dayName] = (countsByDay[dayName] || 0) + 1;
        }
      });

      return days.map(day => ({ day, value: countsByDay[day] }));
    },
    enabled: !!show?.id,
  });

  // Fetch events per participant using RPC (top 10)
  const { data: eventsPerParticipant, isLoading: eventsPerParticipantLoading } = useQuery({
    queryKey: ["dashboard-events-per-participant", show?.id],
    queryFn: async (): Promise<EventsPerParticipant[]> => {
      if (!show?.id) return [];

      const { data, error } = await supabase
        .rpc('get_participant_event_counts', { 
          p_show_id: show.id,
          p_limit: 10 
        });

      if (error) {
        console.error("[Dashboard] get_participant_event_counts error:", error);
        return [];
      }

      return (data || []).map((p: { name: string; event_count: number; photo_url: string | null }) => ({
        name: p.name,
        value: Number(p.event_count),
        avatar: p.photo_url,
      }));
    },
    enabled: !!show?.id,
  });

  // Fetch user points using RPC (live calculated, top 10)
  const { data: userPoints, isLoading: userPointsLoading } = useQuery({
    queryKey: ["dashboard-user-points", show?.id],
    queryFn: async (): Promise<UserPoints[]> => {
      if (!show?.id) return [];

      const { data, error } = await supabase
        .rpc('get_user_points_comparison', { 
          p_show_id: show.id 
        });

      if (error) {
        console.error("[Dashboard] get_user_points_comparison error:", error);
        return [];
      }

      return (data || []).map((u: { username: string; gameweek_points: number; total_points: number; avatar_url: string | null }) => ({
        name: u.username,
        gwPoints: Number(u.gameweek_points),
        totalPoints: Number(u.total_points),
        avatar: u.avatar_url,
      }));
    },
    enabled: !!show?.id,
  });

  // Fetch recent events with rule info
  const { data: recentEvents, isLoading: recentEventsLoading } = useQuery({
    queryKey: ["dashboard-recent-events", show?.id],
    queryFn: async (): Promise<RecentEvent[]> => {
      if (!show?.id) return [];

      const { data: events } = await supabase
        .from("events")
        .select(`
          id,
          episode_number,
          points_awarded,
          notes,
          game_rules(event_name, description)
        `)
        .eq("show_id", show.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!events) return [];

      const { data: participantCounts } = await supabase
        .from("events")
        .select("id, participant_id")
        .eq("show_id", show.id);

      const eventParticipantCount: Record<string, Set<string>> = {};
      participantCounts?.forEach(e => {
        if (e.participant_id) {
          if (!eventParticipantCount[e.id]) {
            eventParticipantCount[e.id] = new Set();
          }
          eventParticipantCount[e.id].add(e.participant_id);
        }
      });

      return events.map((event, index) => {
        const rule = event.game_rules as { event_name: string; description: string | null } | null;
        return {
          id: event.id,
          number: index + 1,
          name: rule?.event_name || "Event",
          description: rule?.description || event.notes || "No description",
          points: event.points_awarded,
          participants: eventParticipantCount[event.id]?.size || 1,
        };
      });
    },
    enabled: !!show?.id,
  });

  // Fetch active users per day (last 30 days)
  const { data: activeUsersData, isLoading: activeUsersLoading } = useQuery({
    queryKey: ["dashboard-active-users", show?.id],
    queryFn: async (): Promise<ActiveUsersData[]> => {
      if (!show?.id) return [];

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      const { data: users } = await supabase
        .from("show_users")
        .select("joined_at")
        .eq("show_id", show.id)
        .gte("joined_at", thirtyDaysAgo.toISOString());

      const countsByDay: Record<number, number> = {};
      for (let i = 1; i <= 31; i++) {
        countsByDay[i] = 0;
      }

      users?.forEach(user => {
        const day = new Date(user.joined_at).getDate();
        countsByDay[day] = (countsByDay[day] || 0) + 1;
      });

      return Array.from({ length: 31 }, (_, i) => ({
        day: i + 1,
        value: countsByDay[i + 1] || 0,
      }));
    },
    enabled: !!show?.id,
  });

  const isLoading = statsLoading || eventsPerDayLoading || eventsPerParticipantLoading || 
                    userPointsLoading || recentEventsLoading || activeUsersLoading;

  return {
    stats: stats || { totalUsers: 0, totalEvents: 0, leagues: 0, totalParticipants: 0 },
    prevStats: prevStats || { totalUsers: 0, totalEvents: 0, leagues: 0, totalParticipants: 0 },
    eventsPerDay: eventsPerDay || [],
    eventsPerParticipant: eventsPerParticipant || [],
    userPoints: userPoints || [],
    recentEvents: recentEvents || [],
    activeUsersData: activeUsersData || [],
    isLoading,
  };
}
