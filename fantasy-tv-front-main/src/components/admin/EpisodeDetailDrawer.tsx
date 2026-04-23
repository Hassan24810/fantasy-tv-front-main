import React, { useState, useMemo, useEffect, useCallback, forwardRef } from "react";
import {
  X,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  Film,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddEpisodeEventSheet } from "@/components/admin/AddEpisodeEventSheet";
import { EditEpisodeEventSheet } from "@/components/admin/EditEpisodeEventSheet";
import { DeleteEpisodeEventDialog } from "@/components/admin/DeleteEpisodeEventDialog";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDuration, getEpisodeStatus } from "@/lib/utils";
import type { Episode } from "@/pages/Episodes";

interface EventParticipant {
  id: string;
  participant_id: string;
  participant_name: string;
  photo_url: string | null;
  points: number;
  position: number;
}

export interface EpisodeEvent {
  id: string;
  episodeId: string;
  timeInEpisode: string;
  date: string;
  timeSlot: string;
  eventRule: string;
  eventText: string;
  participants: EventParticipant[];
  totalPoints: number;
  ruleId?: string;
  eventOffsetMinutes: number;
  eventOffsetSeconds: number;
  notes: string | null;
  ruleTemplate?: string;
  ruleParticipantsCount?: number;
  ruleParticipantCountMode?: string;
  rulePointsPerPosition?: unknown;
}

interface EpisodeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: Episode | null;
}

type SortField = "timeInEpisode" | "eventRule" | "points";
type SortDirection = "asc" | "desc";

export const EpisodeDetailDrawer = forwardRef<HTMLDivElement, EpisodeDetailDrawerProps>(
  function EpisodeDetailDrawer({ open, onOpenChange, episode }, ref) {
    const { t, i18n } = useTranslation();
    const { show } = useAdminShow();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("timeInEpisode");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [events, setEvents] = useState<EpisodeEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime] = useState(new Date());

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<EpisodeEvent | null>(null);

    const formatDateTime = (dateStr: string | null) => {
      if (!dateStr) return t("admin.notScheduled");
      const date = new Date(dateStr);
      const locale = i18n.language || undefined;
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    };

    const statusLabel = (status: string) => {
      switch (status) {
        case "LIVE":
          return t("admin.live");
        case "UPCOMING":
          return t("admin.upcoming");
        case "ENDED":
          return t("admin.ended");
        default:
          return t("admin.draft");
      }
    };

  // Fetch events for this episode with all participants
  const fetchEvents = useCallback(async () => {
    if (!show?.id || !episode?.episodeNumber) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch events with rule info
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          episode_number,
          event_date,
          event_offset_minutes,
          points_awarded,
          notes,
          rule_id,
          game_rules (id, event_name, points, template, participants_count, participant_count_mode, points_per_position)
        `)
        .eq("show_id", show.id)
        .eq("episode_number", episode.episodeNumber)
        .order("event_offset_minutes", { ascending: true });

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        setEvents([]);
        return;
      }

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      // Fetch all event_participants for these events
      const eventIds = eventsData.map(e => e.id);
      const { data: epData, error: epError } = await supabase
        .from("event_participants")
        .select(`
          id,
          event_id,
          participant_id,
          points_awarded,
          participant_position,
          participants (id, name, photo_url)
        `)
        .in("event_id", eventIds)
        .order("participant_position", { ascending: true });

      if (epError) {
        console.error("Error fetching event participants:", epError);
      }

      // Group participants by event_id
      const participantsByEvent: Record<string, EventParticipant[]> = {};
      (epData || []).forEach((ep: any) => {
        if (!participantsByEvent[ep.event_id]) {
          participantsByEvent[ep.event_id] = [];
        }
        participantsByEvent[ep.event_id].push({
          id: ep.id,
          participant_id: ep.participant_id,
          participant_name: ep.participants?.name || t("common.unknown"),
          photo_url: ep.participants?.photo_url || null,
          points: ep.points_awarded,
          position: ep.participant_position || 1,
        });
      });

      // Transform data to match EpisodeEvent interface
      const transformedEvents: EpisodeEvent[] = eventsData.map((event: any) => {
        const eventParticipants = participantsByEvent[event.id] || [];
        const totalPoints = eventParticipants.reduce((sum, p) => sum + p.points, 0);

        // Build event text from participants
        const participantNames = eventParticipants.map((p) => p.participant_name).join(", ");

        // Format time display from offset minutes (converted to HH:MM:SS)
        // The RPC now stores seconds, but we read minutes and convert for display
        const offsetMinutes = event.event_offset_minutes || 0;
        const offsetSeconds = offsetMinutes * 60; // Convert to seconds for consistency
        const hours = Math.floor(offsetSeconds / 3600);
        const mins = Math.floor((offsetSeconds % 3600) / 60);
        const secs = offsetSeconds % 60;
        const timeDisplay = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;

        return {
          id: event.id,
          episodeId: episode.id,
          timeInEpisode: timeDisplay,
          date: event.event_date ? format(new Date(event.event_date), "yyyy-MM-dd") : "",
          timeSlot: timeDisplay,
          eventRule: event.game_rules?.event_name || t("admin.unknownRule"),
          eventText: event.notes || `${participantNames} - ${event.game_rules?.event_name || t("admin.event")}`,
          participants: eventParticipants,
          totalPoints,
          ruleId: event.rule_id,
          eventOffsetMinutes: offsetMinutes,
          eventOffsetSeconds: offsetSeconds,
          notes: event.notes,
          ruleTemplate: event.game_rules?.template,
          ruleParticipantsCount: event.game_rules?.participants_count,
          ruleParticipantCountMode: event.game_rules?.participant_count_mode,
          rulePointsPerPosition: event.game_rules?.points_per_position,
        };
      });

      setEvents(transformedEvents);
    } catch (err) {
      console.error("Unexpected error fetching events:", err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [show?.id, episode?.episodeNumber, episode?.id]);

  useEffect(() => {
    if (open && episode) {
      fetchEvents();
    }
  }, [open, episode, fetchEvents, i18n.language]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> 
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events.filter((event) =>
      event.eventRule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.eventText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.participants.some(p => p.participant_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "timeInEpisode":
          comparison = a.timeInEpisode.localeCompare(b.timeInEpisode);
          break;
        case "eventRule":
          comparison = a.eventRule.localeCompare(b.eventRule);
          break;
        case "points":
          comparison = a.totalPoints - b.totalPoints;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [events, searchQuery, sortField, sortDirection]);


  const handleEdit = (event: EpisodeEvent) => {
    setSelectedEvent(event);
    setIsEditOpen(true);
  };

  const handleDelete = (event: EpisodeEvent) => {
    setSelectedEvent(event);
    setIsDeleteOpen(true);
  };

  const handleEventAdded = () => {
    fetchEvents();
  };

  const handleEventUpdated = () => {
    fetchEvents();
  };

  const handleEventDeleted = async () => {
    if (!selectedEvent) return;
    
    try {
      // Delete event_participants first (should cascade, but explicit is safer)
      await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", selectedEvent.id);

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", selectedEvent.id);

      if (error) {
        console.error("Error deleting event:", error);
        return;
      }

      fetchEvents();
      setIsDeleteOpen(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error("Unexpected error deleting event:", err);
    }
  };

  if (!episode) return null;

  const status = getEpisodeStatus(episode, currentTime);
  const isLive = status === "LIVE";

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh] max-h-[90vh] bg-background">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DrawerHeader className="border-b border-border px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Film className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DrawerTitle className="text-xl font-semibold text-foreground">
                      {t("admin.episode")} {episode.episodeNumber}: {episode.episodeName}
                    </DrawerTitle>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <Badge
                        variant={isLive ? "default" : "secondary"}
                        className={
                          isLive
                            ? "bg-red-500 text-white hover:bg-red-500 border-0"
                            : status === "ENDED"
                              ? "bg-slate-500 text-white hover:bg-slate-500 border-0"
                              : status === "UPCOMING"
                                ? "bg-blue-500 text-white hover:bg-blue-500 border-0"
                                : "bg-muted text-muted-foreground hover:bg-muted border-0"
                        }
                      >
                        {statusLabel(status)}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDuration(episode.durationSeconds)}
                      </span>
                      {episode.activeFromDateTime && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(episode.activeFromDateTime)}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Film className="h-4 w-4" />
                        {events.length} {t("admin.events").toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            {/* Content */}
            <div className="flex-1 overflow-hidden px-6 py-4">
              {/* Search and Add */}
              <div className="flex items-center justify-between mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.searchEvents")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" />
                  {t("admin.addEvent")}
                </Button>
              </div>

              {/* Events Table */}
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden h-[calc(100%-60px)]">
                <div className="overflow-auto h-full">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead
                            className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                            onClick={() => handleSort("timeInEpisode")}
                          >
                            <div className="flex items-center">
                              {t("admin.time")}
                              {getSortIcon("timeInEpisode")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                            onClick={() => handleSort("eventRule")}
                          >
                            <div className="flex items-center">
                              {t("admin.eventRule")}
                              {getSortIcon("eventRule")}
                            </div>
                          </TableHead>
                          <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-3 px-4">
                            {t("admin.participants")}
                          </TableHead>
                          <TableHead
                            className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                            onClick={() => handleSort("points")}
                          >
                            <div className="flex items-center">
                              {t("admin.points")}
                              {getSortIcon("points")}
                            </div>
                          </TableHead>
                          <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-3 px-4">
                            {t("admin.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedEvents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                              {events.length === 0
                                ? t("admin.noEventsYet")
                                : t("admin.noEventsMatchSearch")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSortedEvents.map((event) => (
                            <TableRow 
                              key={event.id} 
                              className="border-b border-border/50 transition-colors hover:bg-muted/30"
                            >
                              <TableCell className="py-3 px-4 text-foreground font-medium">
                                {event.timeInEpisode}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                                  {event.eventRule}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {/* Avatar stack for multiple participants */}
                                  <div className="flex -space-x-2">
                                    {event.participants.slice(0, 5).map((p, idx) => (
                                      <Avatar key={p.id} className="h-7 w-7 border-2 border-white">
                                        <AvatarImage src={p.photo_url || undefined} />
                                        <AvatarFallback className="text-[10px] bg-primary/10">
                                          {p.participant_name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {event.participants.length > 5 && (
                                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-medium border-2 border-white">
                                        +{event.participants.length - 5}
                                      </div>
                                    )}
                                  </div>
                                  {/* Names */}
                                  <span className="text-sm text-muted-foreground truncate max-w-48">
                                    {event.participants.map(p => p.participant_name).join(", ")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className={`font-semibold ${event.totalPoints >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {event.totalPoints >= 0 ? "+" : ""}{event.totalPoints}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={() => handleEdit(event)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(event)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add Event Sheet */}
      <AddEpisodeEventSheet
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        episode={episode}
        onEventAdded={handleEventAdded}
      />

      {/* Edit Event Sheet */}
      <EditEpisodeEventSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        event={selectedEvent}
        episode={episode}
        onEventUpdated={handleEventUpdated}
      />

      {/* Delete Event Dialog */}
      <DeleteEpisodeEventDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        event={selectedEvent}
        onConfirmDelete={handleEventDeleted}
      />
    </>
  );
});
