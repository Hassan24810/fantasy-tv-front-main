import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Trophy, UserCircle, LogOut, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ShowSidebar } from "@/components/show/ShowSidebar";
import { StatsCard } from "@/components/show/StatsCard";
import { ActiveUsersChart } from "@/components/show/ActiveUsersChart";
import { EventsPerDayChart } from "@/components/show/EventsPerDayChart";
import { EventsPerParticipantChart } from "@/components/show/EventsPerParticipantChart";
import { PointsChart } from "@/components/show/PointsChart";
import { EventsTable } from "@/components/show/EventsTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Show {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  season_number: number | null;
  episode_count: number | null;
  status: string | null;
  cover_image_url: string | null;
}

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
  status: string | null;
}

interface GameRule {
  id: string;
  event_name: string;
  event_type: string;
  points: number;
  description: string | null;
}

interface Event {
  id: string;
  episode_number: number;
  points_awarded: number;
  notes: string | null;
  participant_id: string | null;
}

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rules, setRules] = useState<GameRule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchShowData();
    }
  }, [user, id]);

  const fetchShowData = async () => {
    try {
      const { data: showData, error: showError } = await supabase
        .from("shows")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (showError) throw showError;
      if (!showData) {
        toast({
          title: "Not Found",
          description: "Show not found",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      setShow(showData);

      const { data: participantsData } = await supabase
        .from("participants")
        .select("id, name, photo_url, status")
        .eq("show_id", id);
      setParticipants(participantsData || []);

      const { data: rulesData } = await supabase
        .from("game_rules")
        .select("id, event_name, event_type, points, description")
        .eq("show_id", id);
      setRules(rulesData || []);

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, episode_number, points_awarded, notes, participant_id")
        .eq("show_id", id);
      setEvents(eventsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load show details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock data for charts
  const activeUsersData = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    value: Math.floor(Math.random() * 10000000) + 1000000,
  }));

  const eventsPerParticipantData = participants.slice(0, 4).map((p) => ({
    name: p.name.split(" ")[0],
    value: Math.floor(Math.random() * 25) + 5,
    avatar: p.photo_url,
  }));

  const pointsData = participants.slice(0, 10).map((p) => ({
    name: p.name.split(" ")[0],
    gwPoints: Math.floor(Math.random() * 20) + 1,
    totalPoints: Math.floor(Math.random() * 200) + 50,
  }));

  const eventsTableData = rules.map((rule, index) => ({
    id: rule.id,
    number: index + 1,
    name: rule.event_name,
    description: rule.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    points: rule.points,
    participants: Math.floor(Math.random() * 30) + 2,
  }));

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!show) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <ShowSidebar />
        <SidebarInset className="flex-1 bg-background">
          {/* Top Header */}
          <header className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-sidebar border-sidebar-border">
                <DropdownMenuItem 
                  onClick={() => signOut()} 
                  className="gap-2 cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Main Content */}
          <main className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Active Users"
                value={4423}
                icon={Users}
                change="14%"
                changeType="positive"
              />
              <StatsCard
                title="Total Events"
                value={events.length || 2423}
                icon={Calendar}
                change="14%"
                changeType="positive"
              />
              <StatsCard
                title="Leagues"
                value={1444}
                icon={Trophy}
                change="14%"
                changeType="positive"
              />
              <StatsCard
                title="Total Participants"
                value={participants.length || 6325}
                icon={UserCircle}
                change="14%"
                changeType="positive"
              />
            </div>

            {/* Active Users Chart */}
            <ActiveUsersChart data={activeUsersData} />

            {/* Events Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EventsPerDayChart />
              <EventsPerParticipantChart
                data={
                  eventsPerParticipantData.length > 0
                    ? eventsPerParticipantData
                    : [
                        { name: "User 1", value: 28 },
                        { name: "User 2", value: 22 },
                        { name: "User 3", value: 18 },
                        { name: "User 4", value: 15 },
                      ]
                }
              />
            </div>

            {/* Points Chart */}
            <PointsChart
              data={
                pointsData.length > 0
                  ? pointsData
                  : Array.from({ length: 10 }, (_, i) => ({
                      name: `P${i + 1}`,
                      gwPoints: Math.floor(Math.random() * 20) + 1,
                      totalPoints: Math.floor(Math.random() * 200) + 50,
                    }))
              }
            />

            {/* Events Table */}
            <EventsTable
              events={
                eventsTableData.length > 0
                  ? eventsTableData
                  : Array.from({ length: 5 }, (_, i) => ({
                      id: `${i + 1}`,
                      number: i + 1,
                      name: "Event Name",
                      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
                      points: Math.floor(Math.random() * 60) + 10,
                      participants: Math.floor(Math.random() * 30) + 2,
                    }))
              }
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
