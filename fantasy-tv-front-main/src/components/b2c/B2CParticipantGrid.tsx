import { useState, useMemo, useEffect } from "react";
import { useShow } from "@/contexts/ShowContext";
import { User, Users, Expand } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { isParticipantEliminated, isParticipantReleased } from "@/lib/participantSelectability";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RuleIconOnly } from "@/components/ui/RuleIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Participant = Tables<"participants">;
type Episode = Tables<"episodes">;

type GenderFilter = "both" | "male" | "female";
type SortOption = "default" | "name" | "points";
type ParticipantEventRow = {
  eventId: string;
  episodeNumber: number;
  ruleName: string;
  ruleIcon: string;
  ruleTemplate: string | null;
  eventOffsetMinutes: number;
  selfPoints: number;
  participants: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    points: number;
    position: number;
  }>;
};

function normalizeGender(g: string | null | undefined): "male" | "female" | "other" {
  const v = (g || "").toLowerCase().trim();
  if (v === "male" || v === "m" || v === "man") return "male";
  if (v === "female" || v === "f" || v === "woman") return "female";
  return "other";
}

function formatTimeOffset(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}.${mins.toString().padStart(2, "0")}`;
}

function formatRuleTemplate(
  template: string | null,
  participants: ParticipantEventRow["participants"]
): string {
  if (!template) {
    return participants
      .slice(0, 2)
      .map((p) => `${p.name} (${p.points >= 0 ? "+" : ""}${p.points})`)
      .join(", ");
  }
  let result = template;
  const sorted = [...participants].sort((a, b) => a.position - b.position);
  sorted.forEach((p) => {
    result = result.replace(
      `{P${p.position}}`,
      `${p.name} (${p.points >= 0 ? "+" : ""}${p.points})`
    );
  });
  return result;
}

/**
 * Dashboard-only participants view: 5-column grid, ~3 rows visible with scroll.
 * Does not replace B2CParticipants (carousel) used on the landing page.
 */
export const B2CParticipantGrid = () => {
  const { t } = useTranslation();
  const { participants, show, episodes, events, rules } = useShow();

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [participantPoints, setParticipantPoints] = useState<Record<string, { total: number; gw: number }>>({});
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("both");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [participantEvents, setParticipantEvents] = useState<ParticipantEventRow[]>([]);
  const [isLoadingParticipantEvents, setIsLoadingParticipantEvents] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!show?.id || participants.length === 0) return;
      setIsLoadingPoints(true);
      const pointsMap: Record<string, { total: number; gw: number }> = {};

      const { data: activeEpisode } = await supabase.rpc("get_current_active_episode", {
        p_show_id: show.id,
      });

      await Promise.all(
        participants.map(async (p) => {
          const { data: totalPoints } = await supabase.rpc("calculate_participant_points", {
            p_participant_id: p.id,
            p_show_id: show.id,
            p_episode_number: null,
          });

          let gwPoints = 0;
          if (activeEpisode?.episode_number) {
            const { data: gwData } = await supabase.rpc("calculate_participant_points", {
              p_participant_id: p.id,
              p_show_id: show.id,
              p_episode_number: activeEpisode.episode_number,
            });
            gwPoints = gwData || 0;
          }

          pointsMap[p.id] = { total: totalPoints || 0, gw: gwPoints };
        })
      );

      setParticipantPoints(pointsMap);
      setIsLoadingPoints(false);
    };

    fetchPoints();
  }, [participants, show?.id]);

  const getIsEliminated = (participant: Participant): boolean =>
    isParticipantEliminated(participant, { episodes, events });

  const releasedParticipants = useMemo(
    () => participants.filter((p) => isParticipantReleased(p, { episodes, events })),
    [participants, episodes, events]
  );

  const filteredSorted = useMemo(() => {
    let list = [...releasedParticipants];

    if (genderFilter === "male") {
      list = list.filter((p) => normalizeGender(p.gender) === "male");
    } else if (genderFilter === "female") {
      list = list.filter((p) => normalizeGender(p.gender) === "female");
    }

    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "points") {
      list.sort(
        (a, b) =>
          (participantPoints[b.id]?.total ?? 0) - (participantPoints[a.id]?.total ?? 0)
      );
    }

    return list;
  }, [releasedParticipants, genderFilter, sortBy, participantPoints]);

  useEffect(() => {
    const fetchParticipantEvents = async () => {
      if (!selectedParticipant?.id || !show?.id || !isStatsModalOpen) {
        setParticipantEvents([]);
        return;
      }

      setIsLoadingParticipantEvents(true);
      try {
        const { data: selfRows, error: selfError } = await supabase
          .from("event_participants")
          .select(
            `
              event_id,
              points_awarded,
              participant_position,
              events!inner(
                id,
                episode_number,
                event_offset_minutes,
                rule_id
              )
            `
          )
          .eq("participant_id", selectedParticipant.id);

        if (selfError) throw selfError;
        const selfData = (selfRows || []) as any[];
        const eventIds = selfData.map((row) => row.event_id);
        if (eventIds.length === 0) {
          setParticipantEvents([]);
          return;
        }

        const { data: allRows, error: allError } = await supabase
          .from("event_participants")
          .select(
            `
              event_id,
              points_awarded,
              participant_position,
              participants!inner(
                id,
                name,
                photo_url
              )
            `
          )
          .in("event_id", eventIds)
          .order("participant_position", { ascending: true });

        if (allError) throw allError;

        const grouped: Record<string, ParticipantEventRow["participants"]> = {};
        (allRows || []).forEach((row: any) => {
          if (!grouped[row.event_id]) grouped[row.event_id] = [];
          grouped[row.event_id].push({
            id: row.participants.id,
            name: row.participants.name,
            photoUrl: row.participants.photo_url,
            points: row.points_awarded || 0,
            position: row.participant_position || 1,
          });
        });

        const rulesById: Record<string, any> = {};
        rules.forEach((r: any) => {
          rulesById[r.id] = r;
        });
        const mapped = selfData
          .map((row: any): ParticipantEventRow => {
            const eventObj = row.events;
            const rule = rulesById[eventObj.rule_id];
            return {
              eventId: row.event_id,
              episodeNumber: eventObj.episode_number || 0,
              ruleName: rule?.event_name || "Event",
              ruleIcon: rule?.icon || "star",
              ruleTemplate: rule?.template || null,
              eventOffsetMinutes: eventObj.event_offset_minutes || 0,
              selfPoints: row.points_awarded || 0,
              participants: grouped[row.event_id] || [],
            };
          })
          .sort((a, b) =>
            b.episodeNumber === a.episodeNumber
              ? a.eventOffsetMinutes - b.eventOffsetMinutes
              : b.episodeNumber - a.episodeNumber
          );

        setParticipantEvents(mapped);
      } catch (error) {
        console.error("Failed to load participant events", error);
        setParticipantEvents([]);
      } finally {
        setIsLoadingParticipantEvents(false);
      }
    };

    fetchParticipantEvents();
  }, [selectedParticipant?.id, show?.id, isStatsModalOpen, rules]);

  const topRepeatedEvents = useMemo(() => {
    const counts = new Map<string, number>();
    participantEvents.forEach((ev) => {
      counts.set(ev.ruleName, (counts.get(ev.ruleName) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([ruleName, count]) => ({ ruleName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [participantEvents]);

  const pointsLatestEpisodes = useMemo(() => {
    const grouped = new Map<number, number>();
    participantEvents.forEach((ev) => {
      grouped.set(ev.episodeNumber, (grouped.get(ev.episodeNumber) || 0) + ev.selfPoints);
    });
    return [...grouped.entries()]
      .map(([episodeNumber, points]) => ({ episodeNumber, points }))
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
      .slice(-10);
  }, [participantEvents]);

  const commonPairing = useMemo(() => {
    if (!selectedParticipant) return null;
    const pairCount = new Map<string, { name: string; count: number; photoUrl: string | null }>();
    participantEvents.forEach((ev) => {
      ev.participants
        .filter((p) => p.id !== selectedParticipant.id)
        .forEach((p) => {
          const current = pairCount.get(p.id);
          pairCount.set(p.id, {
            name: p.name,
            count: (current?.count || 0) + 1,
            photoUrl: p.photoUrl,
          });
        });
    });

    const top = [...pairCount.entries()]
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.count - a.count)[0];
    return top || null;
  }, [participantEvents, selectedParticipant]);

  const positiveEventsCount = useMemo(
    () => participantEvents.filter((ev) => ev.selfPoints > 0).length,
    [participantEvents]
  );
  const negativeEventsCount = useMemo(
    () => participantEvents.filter((ev) => ev.selfPoints < 0).length,
    [participantEvents]
  );

  const episodesByNumber = useMemo(() => {
    const map = new Map<number, Episode>();
    episodes.forEach((ep) => map.set(ep.episode_number, ep));
    return map;
  }, [episodes]);

  if (participants.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10 border border-slate-200 rounded-2xl bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("participants.title")}</h2>
          <div className="text-center py-16 rounded-2xl bg-slate-50 border border-slate-200">
            <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 text-lg">{t("participants.noParticipants")}</p>
            <p className="text-slate-500 text-sm mt-2">{t("participants.checkBackSoon")}</p>
          </div>
        </div>
      </div>
    );
  }

  const renderGenderToggle = () => (
    <div
      className="inline-flex w-full overflow-hidden rounded-xl border bg-white md:inline-flex md:w-auto"
      style={{ borderColor: "rgba(var(--show-primary-rgb), 0.55)" }}
    >
      {(
        [
          { key: "both" as const, label: t("participants.genderBoth", "Both"), icon: Users },
          { key: "male" as const, label: t("participants.genderMale", "Male"), sym: "♂" },
          { key: "female" as const, label: t("participants.genderFemale", "Female"), sym: "♀" },
        ] as const
      ).map((item, idx) => {
        const active = genderFilter === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setGenderFilter(item.key)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors md:flex-initial md:min-w-[112px]",
              idx > 0 && "border-l",
              active
                ? "text-white"
                : "bg-white text-[rgb(var(--show-primary-rgb))]"
            )}
            style={
              active
                ? {
                    background: `linear-gradient(135deg, var(--show-primary), var(--show-secondary))`,
                    borderLeftColor: idx > 0 ? "rgba(var(--show-primary-rgb), 0.55)" : undefined,
                  }
                : { borderLeftColor: idx > 0 ? "rgba(var(--show-primary-rgb), 0.55)" : undefined }
            }
          >
            {"icon" in item && item.icon ? (
              <item.icon className="h-4 w-4" />
            ) : (
              <span className="text-base leading-none" aria-hidden>
                {"sym" in item ? item.sym : null}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const renderSortControl = () => (
    <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
      <span>{t("participants.sortBy", "Sort by:")}</span>
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
        <SelectTrigger className="h-9 w-[120px] border-slate-200 bg-white md:w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t("participants.sortAll", "All")}</SelectItem>
          <SelectItem value="name">{t("participants.sortName", "Name")}</SelectItem>
          <SelectItem value="points">{t("participants.sortPoints", "Points")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="bg-white min-h-screen py-4 md:py-8">
      <div className="mx-auto max-w-[1480px] rounded-2xl border border-slate-200 px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Mobile — title + sort, then full-width gender */}
        <div className="mb-6 md:hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">{t("participants.title")}</h2>
            {renderSortControl()}
          </div>
          {renderGenderToggle()}
        </div>

        {/* Desktop — unchanged layout */}
        <div className="mb-6 hidden md:flex md:flex-row md:items-center md:justify-between md:gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{t("participants.title")}</h2>
          <div className="flex flex-wrap items-center justify-end gap-4">
            {renderGenderToggle()}
            {renderSortControl()}
          </div>
        </div>

        {isLoadingPoints && (
          <p className="text-sm text-slate-500 mb-4">{t("participants.loadingPoints")}</p>
        )}

        {/* Desktop: fixed height scroll; Mobile: natural page scroll */}
        <div className="max-md:max-h-none max-md:overflow-visible md:max-h-[min(52rem,calc(100vh-11rem))] md:overflow-y-auto md:overflow-x-hidden md:pr-1 md:-mr-1 md:[scrollbar-gutter:stable]">
          <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {filteredSorted.map((participant) => {
              const g = normalizeGender(participant.gender);
              const borderClass =
                g === "female"
                  ? "border-pink-500 ring-1 ring-pink-500/30"
                  : g === "male"
                    ? "border-blue-500 ring-1 ring-blue-500/30"
                    : "border-slate-300";

              const total = participantPoints[participant.id]?.total ?? 0;
              const gw = participantPoints[participant.id]?.gw ?? 0;
              const eliminated = getIsEliminated(participant);

              return (
                <div
                  key={participant.id}
                  className={cn(
                    "relative flex flex-col rounded-xl overflow-hidden bg-white border-2 shadow-sm",
                    borderClass,
                    eliminated && "opacity-70 grayscale-[35%]"
                  )}
                >
                  <div className="relative aspect-[3/4] w-full">
                    {participant.photo_url ? (
                      <img
                        src={participant.photo_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <User className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 45%, transparent 72%)",
                      }}
                    />

                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                      <div
                        className={cn(
                          "flex min-h-8 min-w-[2.75rem] items-center justify-center rounded-full border-2 bg-white px-2 text-[1rem] font-bold leading-none shadow-sm",
                          "border-[#FF4D4F] text-slate-800"
                        )}
                      >
                        {total > 0 ? "+" : ""}
                        {total}
                      </div>
                      <div
                        className={cn(
                          "flex min-h-8 min-w-[2.75rem] items-center justify-center rounded-full border-2 bg-white px-2 text-[1rem] font-bold leading-none shadow-sm",
                          "border-[#00B050] text-slate-800"
                        )}
                      >
                        {gw > 0 ? "+" : ""}
                        {gw}
                      </div>
                    </div>

                    <div className="absolute bottom-20 left-0 right-0 z-10 px-3">
                      <p className="text-sm font-bold text-white leading-tight drop-shadow">
                        {participant.name}
                        {participant.age != null && (
                          <span className="font-semibold text-white/90"> ({participant.age})</span>
                        )}
                      </p>
                      {(participant.occupation || participant.hometown) && (
                        <p className="text-xs text-white/85 mt-0.5 line-clamp-2">
                          {participant.occupation || participant.hometown}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setIsStatsModalOpen(true);
                      }}
                      className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--show-primary-rgb))] bg-black/55 py-2.5 text-[1rem] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    >
                      <Expand className="h-4 w-4" />
                      {t("participants.expand", "Expand")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog
        open={isStatsModalOpen}
        onOpenChange={(open) => {
          setIsStatsModalOpen(open);
          if (!open) setSelectedParticipant(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-slate-200 bg-white p-0 sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedParticipant?.name || "Participant Statistics"}</DialogTitle>
          </DialogHeader>

          <div className="p-5 md:p-6">
            <h2 className="mb-5 text-3xl font-extrabold text-slate-900">{t("events.yourEvents")}</h2>

            <div className="space-y-3">
              {(isLoadingParticipantEvents ? [] : participantEvents.slice(0, 4)).map((event) => (
                <div
                  key={event.eventId}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                      <RuleIconOnly icon={event.ruleIcon} className="h-4 w-4 text-[rgb(var(--show-primary-rgb))]" />
                    </div>
                    <div className="h-5 w-px bg-slate-200" />
                    <span className="w-12 font-medium text-slate-700 tabular-nums">
                      {formatTimeOffset(event.eventOffsetMinutes)}
                    </span>
                    <div className="h-5 w-px bg-slate-200" />
                    <span className="w-24 font-semibold text-slate-900">{event.ruleName}</span>
                    <div className="flex -space-x-2">
                      {event.participants.slice(0, 2).map((p, idx) => (
                        <Avatar
                          key={p.id}
                          className={cn(
                            "h-9 w-9 border-2 border-white",
                            idx === 0 && "ring-2 ring-green-500",
                            idx === 1 && "ring-2 ring-red-500"
                          )}
                        >
                          <AvatarImage src={p.photoUrl || undefined} />
                          <AvatarFallback className="text-xs font-medium">
                            {p.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div className="h-5 w-px bg-slate-200" />
                    <p className="min-w-0 flex-1 truncate text-[1.05rem] text-slate-900">
                      {formatRuleTemplate(event.ruleTemplate, event.participants)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-6 border-b-2 border-slate-300" />

            <h3 className="mb-4 text-2xl font-bold text-slate-900">Participant Statistics</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-[1.1rem] font-semibold text-slate-900">Top 5 Events (most repeated)</h4>
                <div className="flex h-36 items-end justify-between gap-3">
                  {topRepeatedEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No event data yet.</p>
                  ) : (
                    topRepeatedEvents.map((item) => (
                      <div key={item.ruleName} className="flex w-full flex-col items-center gap-2">
                        <div
                          className="w-4 rounded-t bg-[rgb(var(--show-primary-rgb))]"
                          style={{ height: `${Math.max(12, item.count * 16)}px` }}
                        />
                        <span className="w-full truncate text-center text-xs text-slate-600">{item.ruleName}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-[1.1rem] font-semibold text-slate-900">Points in the latest GWs</h4>
                <div className="flex h-36 items-end justify-between gap-2">
                  {pointsLatestEpisodes.length === 0 ? (
                    <p className="text-sm text-slate-500">No points yet.</p>
                  ) : (
                    pointsLatestEpisodes.map((item) => (
                      <div key={item.episodeNumber} className="flex w-full flex-col items-center gap-2">
                        <div
                          className="w-4 rounded-t bg-[rgb(var(--show-primary-rgb))]"
                          style={{ height: `${Math.max(8, Math.min(120, Math.abs(item.points) * 8))}px` }}
                        />
                        <span className="text-xs font-medium text-slate-600">GW{item.episodeNumber}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="mb-2 text-[1.1rem] font-semibold text-slate-900">Most Common Pairing</h4>
                {commonPairing ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={commonPairing.photoUrl || undefined} />
                      <AvatarFallback>{commonPairing.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="text-2xl text-slate-700">
                      {selectedParticipant?.name} &amp; {commonPairing.name} ({commonPairing.count} events together)
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No pairing data yet.</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="text-[1.1rem] font-semibold text-slate-900">Total Positive Events</h4>
                <p className="mt-2 text-3xl text-slate-700">{positiveEventsCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="text-[1.1rem] font-semibold text-slate-900">Total Negative Events</h4>
                <p className="mt-2 text-3xl text-slate-700">{negativeEventsCount}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
