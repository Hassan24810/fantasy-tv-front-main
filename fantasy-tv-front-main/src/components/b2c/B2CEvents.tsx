import { useState, useMemo, useEffect } from "react";
import { useShow } from "@/contexts/ShowContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ChevronDown, ChevronUp, Filter, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getEpisodeStatus, type EpisodeStatus, cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { RuleIconOnly } from "@/components/ui/RuleIcon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyTeamEventsAllEpisodes, type MyTeamEpisodeData } from "@/hooks/useMyTeamEventsAllEpisodes";
import { EpisodeTeamStrip } from "./EpisodeTeamStrip";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;

interface EventParticipant {
  id: string;
  participant_id: string;
  participant_name: string;
  photo_url: string | null;
  points: number;
  position: number;
}

interface EnrichedEvent {
  id: string;
  episode_number: number;
  event_date: string | null;
  event_offset_minutes: number;
  rule_id: string | null;
  rule_name: string;
  rule_icon: string;
  rule_template: string | null;
  notes: string | null;
  participants: EventParticipant[];
  totalPoints: number;
  isRevealed: boolean;
  userPointsEarned?: number;
}

interface EpisodeWithEvents extends Episode {
  events: EnrichedEvent[];
  status: EpisodeStatus;
}

// Check if an event is revealed based on episode start time and event offset
function isEventRevealed(
  event: { event_offset_minutes?: number | null },
  episode: Episode,
  now: Date
): boolean {
  const startTime = episode.active_from_datetime 
    ? new Date(episode.active_from_datetime) 
    : null;
  
  if (!startTime) {
    return episode.is_active;
  }

  const offsetMinutes = event.event_offset_minutes || 0;
  const revealTime = new Date(startTime.getTime() + offsetMinutes * 60000);
  
  return now >= revealTime;
}

// Format minutes into HH:MM format
function formatTimeOffset(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}.${mins.toString().padStart(2, '0')}`;
}

function parseTimeToMinutes(time: string): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

// Render inline event text with colored points
function EventInlineText({ 
  template, 
  participants,
  highlightTeamMembers = false,
}: { 
  template: string | null; 
  participants: Array<EventParticipant & { is_on_team?: boolean }>;
  highlightTeamMembers?: boolean;
}) {
  if (!template || participants.length === 0) {
    return (
      <span className="text-slate-700">
        {participants.map((p, idx) => (
          <span key={p.id || idx}>
            {idx > 0 && ", "}
            <span className={cn("font-medium", highlightTeamMembers && p.is_on_team && "text-primary")}>
              {p.participant_name}
            </span>
            <span className={`ml-1 font-semibold ${p.points >= 0 ? "text-green-600" : "text-red-600"}`}>
              ({p.points >= 0 ? "+" : ""}{p.points})
            </span>
          </span>
        ))}
      </span>
    );
  }

  const parts: React.ReactNode[] = [];
  const regex = /\{P(\d+)\}/g;
  let match;
  let lastIndex = 0;
  let keyIdx = 0;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyIdx++}`} className="text-slate-700">
          {template.slice(lastIndex, match.index)}
        </span>
      );
    }

    const position = parseInt(match[1], 10);
    const participant = participants.find(p => p.position === position);

    if (participant) {
      parts.push(
        <span key={`p-${keyIdx++}`}>
          <span className={cn("font-medium text-slate-900", highlightTeamMembers && (participant as any).is_on_team && "text-primary")}>
            {participant.participant_name}
          </span>
          <span className={`ml-1 font-semibold ${participant.points >= 0 ? "text-green-600" : "text-red-600"}`}>
            ({participant.points >= 0 ? "+" : ""}{participant.points})
          </span>
        </span>
      );
    } else {
      parts.push(
        <span key={`unknown-${keyIdx++}`} className="text-slate-400">
          Unknown
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < template.length) {
    parts.push(
      <span key={`text-end-${keyIdx}`} className="text-slate-700">
        {template.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}

export const B2CEvents = () => {
  const { events, episodes, rules, participants, isLoading, show } = useShow();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [eventParticipantsMap, setEventParticipantsMap] = useState<Record<string, EventParticipant[]>>({});
  const [eventOffsetsMap, setEventOffsetsMap] = useState<Record<string, number>>({});
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  // Filters
  const [filterParticipant, setFilterParticipant] = useState<string>("all");
  const [filterEpisode, setFilterEpisode] = useState<string>("all");
  const [filterRule, setFilterRule] = useState<string>("all");
  const [eventsViewMode, setEventsViewMode] = useState<"all" | "my-team">("all");
  const [filterStartTime, setFilterStartTime] = useState<string>("");
  const [filterEndTime, setFilterEndTime] = useState<string>("");
  const [activeFilterPanel, setActiveFilterPanel] = useState<"none" | "rules" | "timeslot">("none");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // State for per-episode participant filtering in "My Team" mode
  const [selectedTeamParticipant, setSelectedTeamParticipant] = useState<Record<number, string | null>>({});

  // Fetch user's team events for all episodes (only when my-team mode is active)
  const { data: myTeamEpisodesData = [], isLoading: isLoadingMyTeam } = useMyTeamEventsAllEpisodes(
    show?.id,
    eventsViewMode === "my-team"
  );

  // Timer to update current time for reveal checks
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch event_participants and event offsets for all events (for "all" mode)
  useEffect(() => {
    async function fetchEventData() {
      if (!show?.id || events.length === 0 || eventsViewMode === "my-team") {
        if (eventsViewMode === "my-team") return; // Skip fetching in my-team mode
        setEventParticipantsMap({});
        setEventOffsetsMap({});
        return;
      }

      setIsLoadingParticipants(true);
      try {
        const eventIds = events.map(e => e.id);
        
        const { data: participantsData, error: participantsError } = await supabase
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

        if (participantsError) {
          console.error("Error fetching event participants:", participantsError);
        }

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, event_offset_minutes")
          .in("id", eventIds);

        if (eventsError) {
          console.error("Error fetching event offsets:", eventsError);
        }

        const grouped: Record<string, EventParticipant[]> = {};
        (participantsData || []).forEach((ep: any) => {
          if (!grouped[ep.event_id]) {
            grouped[ep.event_id] = [];
          }
          grouped[ep.event_id].push({
            id: ep.id,
            participant_id: ep.participant_id,
            participant_name: ep.participants?.name || "Unknown",
            photo_url: ep.participants?.photo_url || null,
            points: ep.points_awarded,
            position: ep.participant_position || 1,
          });
        });
        setEventParticipantsMap(grouped);

        const offsets: Record<string, number> = {};
        (eventsData || []).forEach((e: any) => {
          offsets[e.id] = e.event_offset_minutes || 0;
        });
        setEventOffsetsMap(offsets);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setIsLoadingParticipants(false);
      }
    }

    fetchEventData();
  }, [show?.id, events, eventsViewMode]);

  // Get visible episodes (LIVE or ENDED)
  const visibleEpisodes = useMemo(() => {
    return episodes
      .filter((ep) => {
        const status = getEpisodeStatus(ep, currentTime);
        return status === "LIVE" || status === "ENDED";
      })
      .sort((a, b) => b.episode_number - a.episode_number);
  }, [episodes, currentTime]);

  // Build enriched events with participants, rule info, and reveal status (for "all" mode)
  const enrichedEvents = useMemo((): EnrichedEvent[] => {
    if (eventsViewMode === "my-team") return [];
    
    return events.map(event => {
      const eventParticipants = eventParticipantsMap[event.id] || [];
      const rule = rules.find(r => r.id === event.rule_id);
      const totalPoints = eventParticipants.reduce((sum, p) => sum + p.points, 0);
      const episode = episodes.find(ep => ep.episode_number === event.episode_number);
      const offsetMinutes = eventOffsetsMap[event.id] || 0;
      
      return {
        id: event.id,
        episode_number: event.episode_number,
        event_date: event.event_date,
        event_offset_minutes: offsetMinutes,
        rule_id: event.rule_id,
        rule_name: rule?.event_name || "Event",
        rule_icon: rule?.icon || "star",
        rule_template: rule?.template || null,
        notes: event.notes,
        participants: eventParticipants,
        totalPoints,
        isRevealed: episode ? isEventRevealed({ event_offset_minutes: offsetMinutes }, episode, currentTime) : false,
      };
    });
  }, [events, eventParticipantsMap, eventOffsetsMap, rules, episodes, currentTime, eventsViewMode]);

  // Build a lookup from myTeamEpisodesData for quick access
  const myTeamDataByEpisode = useMemo(() => {
    const map: Record<number, MyTeamEpisodeData> = {};
    myTeamEpisodesData.forEach((ep) => {
      map[ep.episode_number] = ep;
    });
    return map;
  }, [myTeamEpisodesData]);

  // Build episodes with their events (with filters applied)
  const episodesWithEvents = useMemo((): EpisodeWithEvents[] => {
    let filteredEpisodes = visibleEpisodes;
    
    // Filter by episode dropdown
    if (filterEpisode !== "all") {
      filteredEpisodes = filteredEpisodes.filter(ep => ep.id === filterEpisode);
    }

    if (eventsViewMode === "my-team") {
      // Use data from the RPC for my-team mode
      return filteredEpisodes.map(ep => {
        const myTeamData = myTeamDataByEpisode[ep.episode_number];
        const teamMemberIds = myTeamData?.team_members.map(t => t.participant_id) || [];
        const selectedParticipant = selectedTeamParticipant[ep.episode_number];
        
        let myTeamEvents: EnrichedEvent[] = (myTeamData?.events || []).map(event => ({
          id: event.event_id,
          episode_number: ep.episode_number,
          event_date: null,
          event_offset_minutes: event.event_offset_minutes,
          rule_id: event.rule_id,
          rule_name: event.rule_name,
          rule_icon: event.rule_icon,
          rule_template: event.rule_template,
          notes: event.notes,
          participants: event.all_participants.map((p, idx) => ({
            id: `${event.event_id}-${p.participant_id}`,
            participant_id: p.participant_id,
            participant_name: p.name,
            photo_url: p.photo_url,
            points: p.points,
            position: p.position,
            is_on_team: p.is_on_team,
          })) as any,
          totalPoints: event.all_participants.reduce((sum, p) => sum + p.points, 0),
          isRevealed: true,
          userPointsEarned: event.user_points_earned,
        }));
        
        // Additional filter by selected team participant (inline avatar click)
        if (selectedParticipant) {
          myTeamEvents = myTeamEvents.filter(event =>
            event.participants.some(p => p.participant_id === selectedParticipant)
          );
        }
        
        // Apply rule filter
        if (filterRule !== "all") {
          myTeamEvents = myTeamEvents.filter(event => event.rule_id === filterRule);
        }

        // Apply time slot filter
        const startMinutes = parseTimeToMinutes(filterStartTime);
        const endMinutes = parseTimeToMinutes(filterEndTime);
        if (startMinutes !== null) {
          myTeamEvents = myTeamEvents.filter(event => event.event_offset_minutes >= startMinutes);
        }
        if (endMinutes !== null) {
          myTeamEvents = myTeamEvents.filter(event => event.event_offset_minutes <= endMinutes);
        }
        
        // Sort by offset
        myTeamEvents.sort((a, b) => a.event_offset_minutes - b.event_offset_minutes);
        
        return {
          ...ep,
          events: myTeamEvents,
          status: getEpisodeStatus(ep, currentTime),
        };
      });
    } else {
      // "all" mode - use regular enriched events
      return filteredEpisodes.map(ep => {
        let episodeEvents = enrichedEvents
          .filter(event => 
            event.episode_number === ep.episode_number && 
            event.isRevealed
          );
        
        // Filter by participant
        if (filterParticipant !== "all") {
          episodeEvents = episodeEvents.filter(event =>
            event.participants.some(p => p.participant_id === filterParticipant)
          );
        }
        
        // Filter by rule
        if (filterRule !== "all") {
          episodeEvents = episodeEvents.filter(event => event.rule_id === filterRule);
        }

        // Apply time slot filter
        const startMinutes = parseTimeToMinutes(filterStartTime);
        const endMinutes = parseTimeToMinutes(filterEndTime);
        if (startMinutes !== null) {
          episodeEvents = episodeEvents.filter(event => event.event_offset_minutes >= startMinutes);
        }
        if (endMinutes !== null) {
          episodeEvents = episodeEvents.filter(event => event.event_offset_minutes <= endMinutes);
        }
        
        // Sort by offset
        episodeEvents.sort((a, b) => a.event_offset_minutes - b.event_offset_minutes);
        
        return {
          ...ep,
          events: episodeEvents,
          status: getEpisodeStatus(ep, currentTime),
        };
      });
    }
  }, [visibleEpisodes, enrichedEvents, currentTime, filterEpisode, filterParticipant, filterRule, eventsViewMode, myTeamDataByEpisode, selectedTeamParticipant, filterStartTime, filterEndTime]);

  // Auto-expand the latest episode (first in sorted list)
  useEffect(() => {
    if (episodesWithEvents.length > 0 && expandedEpisodes.size === 0) {
      setExpandedEpisodes(new Set([episodesWithEvents[0].id]));
    }
  }, [episodesWithEvents]);

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  };

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Handle avatar click in team strip
  const handleTeamParticipantClick = (episodeNumber: number, participantId: string) => {
    setSelectedTeamParticipant(prev => ({
      ...prev,
      [episodeNumber]: prev[episodeNumber] === participantId ? null : participantId
    }));
  };

  const appliedFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (filterParticipant !== "all") {
      const selected = participants.find((p) => p.id === filterParticipant);
      chips.push({
        key: "participant",
        label: selected?.name || t("events.allParticipants"),
        onRemove: () => setFilterParticipant("all"),
      });
    }

    if (filterEpisode !== "all") {
      const selected = visibleEpisodes.find((ep) => ep.id === filterEpisode);
      chips.push({
        key: "episode",
        label: selected ? t("events.episodeNumber", { number: selected.episode_number }) : t("events.allEpisodes"),
        onRemove: () => setFilterEpisode("all"),
      });
    }

    if (filterRule !== "all") {
      const selected = rules.find((r) => r.id === filterRule);
      chips.push({
        key: "rule",
        label: selected?.event_name || t("events.allRules"),
        onRemove: () => setFilterRule("all"),
      });
    }

    if (filterStartTime) {
      chips.push({
        key: "start-time",
        label: `Start: ${filterStartTime}`,
        onRemove: () => setFilterStartTime(""),
      });
    }

    if (filterEndTime) {
      chips.push({
        key: "end-time",
        label: `End: ${filterEndTime}`,
        onRemove: () => setFilterEndTime(""),
      });
    }

    return chips;
  }, [filterParticipant, filterEpisode, filterRule, filterStartTime, filterEndTime, participants, visibleEpisodes, rules, t]);

  // Loading state
  if (isLoading || (eventsViewMode === "all" && isLoadingParticipants) || (eventsViewMode === "my-team" && isLoadingMyTeam)) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('events.yourEvents')}</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (visibleEpisodes.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('events.yourEvents')}</h2>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('events.noEventsAvailable')}</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {t('events.checkBackSoon')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-slate-300 bg-white p-3 max-md:px-3 max-md:py-4 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-3 md:block">
          <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{t('events.yourEvents')}</h2>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
            aria-expanded={mobileFiltersOpen}
            aria-controls="events-filters"
            onClick={() => setMobileFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </div>

          {/* Filter Bar */}
          <div
            id="events-filters"
            className={cn(
              "bg-white rounded-xl border border-slate-200 p-4 mb-6",
              mobileFiltersOpen ? "block" : "max-md:hidden",
              "md:block"
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Filter className="h-4 w-4" />
                {t('common.filter')}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEventsViewMode((prev) => (prev === "my-team" ? "all" : "my-team"));
                  setFilterParticipant("all");
                  setSelectedTeamParticipant({});
                }}
                style={
                  eventsViewMode === "my-team"
                    ? {
                        background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))",
                        color: "white",
                        borderColor: "transparent",
                        boxShadow: "0 8px 20px rgba(var(--show-primary-rgb), 0.25)",
                      }
                    : undefined
                }
                className={cn(
                  "h-10 px-4 rounded-md text-sm font-medium border flex items-center gap-2 transition-colors",
                  eventsViewMode === "my-team"
                    ? "text-white"
                    : "bg-white text-slate-700 border-slate-300"
                )}
              >
                <RuleIconOnly icon="users" className="h-4 w-4" />
                {t('events.yourTeam', 'Your team')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={filterParticipant} onValueChange={setFilterParticipant}>
                <SelectTrigger className="w-full border-slate-300 bg-slate-100">
                  <SelectValue placeholder={t('events.allParticipants')} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{t('events.allParticipants')}</SelectItem>
                  {participants.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterEpisode} onValueChange={setFilterEpisode}>
                <SelectTrigger className="w-full border-slate-300 bg-slate-100">
                  <SelectValue placeholder={t('events.allEpisodes')} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{t('events.allEpisodes')}</SelectItem>
                  {visibleEpisodes.map(ep => (
                    <SelectItem key={ep.id} value={ep.id}>
                      {t('events.episodeNumber', { number: ep.episode_number })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() =>
                  setActiveFilterPanel((prev) => (prev === "rules" ? "none" : "rules"))
                }
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-slate-100 text-sm text-slate-700 flex items-center justify-between"
              >
                <span className="truncate">
                  {filterRule === "all"
                    ? t('events.allRules')
                    : rules.find((r) => r.id === filterRule)?.event_name || t('events.allRules')}
                </span>
                {activeFilterPanel === "rules" ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilterPanel((prev) => (prev === "timeslot" ? "none" : "timeslot"))
                }
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-slate-100 text-sm text-slate-700 flex items-center justify-between"
              >
                <span className="truncate">{t('events.timeslot', 'Timeslot')}</span>
                {activeFilterPanel === "timeslot" ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>
            </div>

            {activeFilterPanel === "rules" && (
              <div className="mt-4">
                <div className="rounded-xl border border-slate-300 bg-slate-100">
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between text-slate-700 font-medium"
                  >
                    <span>{t('events.rules', 'Rules')}</span>
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <div className="border-t border-slate-300 px-4 py-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setFilterRule("all")}
                      className={cn(
                        "w-full text-left text-base transition-colors",
                        filterRule === "all" ? "text-slate-900 font-medium" : "text-slate-600 hover:text-slate-800"
                      )}
                    >
                      {t('events.allRules')}
                    </button>
                    {rules.slice(0, 6).map((rule) => (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => setFilterRule(rule.id)}
                        className={cn(
                          "w-full text-left text-base transition-colors",
                          filterRule === rule.id ? "text-slate-900 font-medium" : "text-slate-600 hover:text-slate-800"
                        )}
                      >
                        {rule.event_name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeFilterPanel === "timeslot" && (
              <div className="mt-4">
                <div className="rounded-xl border border-slate-300 bg-slate-100">
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between text-slate-700 font-medium"
                  >
                    <span>{t('events.timeslot', 'Timeslot')}</span>
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <div className="border-t border-slate-300 px-3 py-3 grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={filterStartTime}
                      onChange={(e) => setFilterStartTime(e.target.value)}
                      className="h-11 rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      aria-label="Start Time"
                    />
                    <input
                      type="time"
                      value={filterEndTime}
                      onChange={(e) => setFilterEndTime(e.target.value)}
                      className="h-11 rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      aria-label="End Time"
                    />
                  </div>
                </div>
              </div>
            )}

            {(appliedFilters.length > 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 max-md:flex-col max-md:items-start">
                <span className="mr-1 text-sm font-semibold text-slate-700">Applied Filter</span>
                {appliedFilters.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {chip.label}
                    <span className="ml-1 text-slate-500">x</span>
                  </button>
                ))}
                <div className="ml-auto max-md:ml-0 max-md:w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterParticipant("all");
                      setFilterEpisode("all");
                      setFilterRule("all");
                      setFilterStartTime("");
                      setFilterEndTime("");
                      setActiveFilterPanel("none");
                    }}
                    className="h-8 px-3 rounded-md border border-slate-300 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Episodes */}
          <div className="space-y-6">
          {episodesWithEvents.map((episode) => {
            const isOpen = expandedEpisodes.has(episode.id);
            const myTeamData = myTeamDataByEpisode[episode.episode_number];
            const teamMembers = myTeamData?.team_members || [];

            return (
              <div key={episode.id} className="border border-slate-200 rounded-xl px-3 md:px-4 pt-1 pb-4">
                {/* Episode Header */}
                <Collapsible open={isOpen} onOpenChange={() => toggleEpisode(episode.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex cursor-pointer flex-col gap-2 py-3 group max-md:pb-2 md:flex-row md:items-center md:justify-between md:gap-0">
                      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3">
                        <h3 className="text-base font-semibold leading-snug text-slate-900 md:text-lg">
                          Episode {episode.episode_number} - {episode.episode_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {episode.status === "LIVE" && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full animate-pulse">
                              {t('events.live')}
                            </span>
                          )}
                          {episode.status === "ENDED" && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-full">
                              {t('events.ended')}
                            </span>
                          )}
                          {episode.active_from_datetime && (
                            <span className="text-slate-500 text-xs font-normal md:text-sm">
                              {format(new Date(episode.active_from_datetime), "EEEE, MMMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-400 self-end group-hover:text-slate-600 transition-colors md:self-auto">
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {/* Inline Team Strip (only in my-team mode) */}
                    {eventsViewMode === "my-team" && (
                      <EpisodeTeamStrip
                        teamMembers={teamMembers}
                        selectedParticipantId={selectedTeamParticipant[episode.episode_number] || null}
                        onParticipantClick={(pid) => handleTeamParticipantClick(episode.episode_number, pid)}
                      />
                    )}

                    {episode.events.length === 0 ? (
                      <div className="bg-slate-50 rounded-lg border border-slate-100 p-6 text-center">
                        <p className="text-slate-500 text-sm">
                          {episode.status === "LIVE" 
                            ? t('events.eventsAppear')
                            : eventsViewMode === "my-team"
                              ? t('events.noTeamEvents')
                              : t('events.noMatchingEvents')}
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl p-2 md:p-3 bg-slate-50/40">
                        {episode.events.map((event) => {
                          const isEventOpen = expandedEvents.has(event.id);
                          const isMyTeamMode = eventsViewMode === "my-team";

                          return (
                            <Collapsible
                              key={event.id}
                              open={isEventOpen}
                              onOpenChange={() => toggleEvent(event.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="mb-2 last:mb-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:bg-slate-50">
                                  {/* Mobile: stacked rows — matches Figma */}
                                  <div className="md:hidden">
                                    <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
                                      <div className="flex items-center justify-center py-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                          <RuleIconOnly
                                            icon={event.rule_icon}
                                            className="h-4 w-4 text-[rgb(var(--show-primary-rgb))]"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-center py-2.5 text-sm font-medium tabular-nums text-slate-600">
                                        {formatTimeOffset(event.event_offset_minutes)}
                                      </div>
                                      <div className="flex items-center justify-center px-1 py-2 text-center text-xs font-semibold leading-tight text-slate-900">
                                        {event.rule_name}
                                      </div>
                                    </div>
                                    {isMyTeamMode && event.userPointsEarned !== undefined && (
                                      <div className="flex justify-end border-b border-slate-100 px-2 py-1">
                                        <span
                                          className={cn(
                                            "text-xs font-bold tabular-nums",
                                            event.userPointsEarned >= 0 ? "text-green-700" : "text-red-700"
                                          )}
                                        >
                                          {event.userPointsEarned >= 0 ? "+" : ""}
                                          {event.userPointsEarned}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex min-h-[52px] items-stretch">
                                      <div className="flex shrink-0 items-center border-r border-slate-200 px-2 py-2">
                                        <div className="flex -space-x-2">
                                          {event.participants.slice(0, 4).map((p, idx) => (
                                            <Avatar
                                              key={p.id}
                                              className={cn(
                                                "h-8 w-8 border-2 border-white",
                                                isMyTeamMode &&
                                                  (p as any).is_on_team &&
                                                  "ring-2 ring-[rgb(var(--show-primary-rgb))]",
                                                !isMyTeamMode &&
                                                  idx === 0 &&
                                                  "ring-2 ring-green-500 ring-offset-2 ring-offset-white",
                                                !isMyTeamMode &&
                                                  idx === 1 &&
                                                  "ring-2 ring-red-500 ring-offset-2 ring-offset-white"
                                              )}
                                            >
                                              <AvatarImage src={p.photo_url || undefined} />
                                              <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                                                {p.participant_name.slice(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="min-w-0 flex flex-1 items-center border-r border-slate-200 px-2 py-2">
                                        <div className="text-xs leading-snug text-slate-800">
                                          <EventInlineText
                                            template={event.rule_template}
                                            participants={event.participants as any}
                                            highlightTeamMembers={isMyTeamMode}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex shrink-0 items-center justify-center px-2 text-slate-400">
                                        {isEventOpen ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Desktop — unchanged */}
                                  <div className="hidden items-center gap-4 px-4 py-3 md:flex">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                      <RuleIconOnly icon={event.rule_icon} className="h-4 w-4 text-slate-600" />
                                    </div>

                                    <div className="w-12 shrink-0 text-sm font-medium text-slate-500">
                                      {formatTimeOffset(event.event_offset_minutes)}
                                    </div>

                                    <div className="h-6 w-px bg-slate-200" />

                                    <div className="w-28 shrink-0 text-sm font-medium text-slate-900">
                                      {event.rule_name}
                                    </div>

                                    <div className="flex shrink-0 -space-x-2">
                                      {event.participants.slice(0, 4).map((p) => (
                                        <Avatar
                                          key={p.id}
                                          className={cn(
                                            "h-8 w-8 border-2 border-white",
                                            isMyTeamMode && (p as any).is_on_team && "ring-2 ring-primary"
                                          )}
                                        >
                                          <AvatarImage src={p.photo_url || undefined} />
                                          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                            {p.participant_name.slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>

                                    <div className="min-w-0 flex-1 truncate text-sm">
                                      <EventInlineText
                                        template={event.rule_template}
                                        participants={event.participants as any}
                                        highlightTeamMembers={isMyTeamMode}
                                      />
                                    </div>

                                    {isMyTeamMode && event.userPointsEarned !== undefined && (
                                      <div
                                        className={cn(
                                          "shrink-0 rounded px-2 py-0.5 text-sm font-bold",
                                          event.userPointsEarned >= 0
                                            ? "bg-green-50 text-green-700"
                                            : "bg-red-50 text-red-700"
                                        )}
                                      >
                                        {event.userPointsEarned >= 0 ? "+" : ""}
                                        {event.userPointsEarned}
                                      </div>
                                    )}

                                    <div className="text-slate-400">
                                      {isEventOpen ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              {/* Expanded Details */}
                              <CollapsibleContent>
                                <div className="-mt-2 mb-2 rounded-b-lg border border-slate-200 border-t-0 bg-slate-50 px-3 py-3 max-md:px-3 md:px-4 md:py-4">
                                  <div className="flex flex-wrap gap-3">
                                    {event.participants.map((p) => (
                                      <div 
                                        key={p.id} 
                                        className={cn(
                                          "flex items-center gap-3 bg-white rounded-lg px-3 py-2 border",
                                          isMyTeamMode && (p as any).is_on_team 
                                            ? "border-primary/30 bg-primary/5" 
                                            : "border-slate-200"
                                        )}
                                      >
                                        <Avatar className={cn(
                                          "h-10 w-10 border-2 border-white shadow-sm",
                                          isMyTeamMode && (p as any).is_on_team && "ring-2 ring-primary"
                                        )}>
                                          <AvatarImage src={p.photo_url || undefined} />
                                          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                            {p.participant_name.slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className={cn(
                                            "font-medium text-slate-900 text-sm",
                                            isMyTeamMode && (p as any).is_on_team && "text-primary"
                                          )}>
                                            {p.participant_name}
                                            {isMyTeamMode && (p as any).is_on_team && (
                                              <span className="ml-1 text-xs text-primary/70">{t('events.yourTeam')}</span>
                                            )}
                                          </div>
                                          <div className={`text-sm font-semibold ${p.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {p.points >= 0 ? "+" : ""}{p.points} {t('events.points')}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {event.notes && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                      <p className="text-sm text-slate-600">{event.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                <div className="mt-4 border-b-2 border-slate-400" />
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};
