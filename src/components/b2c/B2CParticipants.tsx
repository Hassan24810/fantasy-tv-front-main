import { useState, useMemo, useEffect } from "react";
import { useShow } from "@/contexts/ShowContext";
import { User, Crown, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { isParticipantEliminated, isParticipantReleased } from "@/lib/participantSelectability";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

/* ─── Score color helper ─── */
const scoreColor = (pts: number, onDark = true) =>
  pts > 0
    ? "text-emerald-500"
    : pts < 0
      ? "text-red-500"
      : onDark ? "text-white/70" : "text-slate-400";

const scoreBg = (pts: number) =>
  pts > 0
    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-600"
    : pts < 0
      ? "bg-red-500/20 border-red-400/30 text-red-600"
      : "bg-slate-100 border-slate-200 text-slate-500";

/* ─── Participant Card ─── */
interface ParticipantCardProps {
  participant: Participant;
  totalPoints: number;
  gameweekPoints: number;
  isEliminated: boolean;
  isTopRanked: boolean;
  onClick: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  budgetEnabled?: boolean;
}

const ParticipantCard = ({
  participant,
  totalPoints,
  gameweekPoints,
  isEliminated,
  isTopRanked,
  onClick,
  t,
  budgetEnabled,
}: ParticipantCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
        "bg-white/5 backdrop-blur-sm border border-white/10",
        "shadow-sm hover:shadow-2xl hover:shadow-black/40",
        isEliminated
          ? "opacity-60 grayscale-[50%]"
          : "hover:scale-[1.03] hover:-translate-y-1 hover:border-white/20",
        isTopRanked && !isEliminated &&
          "ring-2 ring-[var(--show-primary)] shadow-[var(--show-primary)]/20 shadow-xl"
      )}
    >
      {/* Crown for #1 */}
      {isTopRanked && !isEliminated && (
        <div className="absolute top-2.5 left-2.5 z-20">
           <div className="bg-amber-400 rounded-full p-1.5 shadow-lg shadow-amber-500/30">
             <Crown className="w-3.5 h-3.5 text-amber-900" />
           </div>
        </div>
      )}

      {/* "UTE" badge */}
      {isEliminated && (
        <div className="absolute top-2.5 right-2.5 z-20">
          <Badge className="bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold border-0 px-2 py-0.5">
            {t("participants.out")}
          </Badge>
        </div>
      )}

      {/* Custom status */}
      {!isEliminated && participant.status === "customized" && participant.custom_status_label && (
        <div className="absolute top-2.5 right-2.5 z-20">
          <Badge className="bg-purple-500/80 backdrop-blur-sm text-white text-[10px] font-bold border-0 px-2 py-0.5">
            {participant.custom_status_label}
          </Badge>
        </div>
      )}

      {/* Price badge — shift down if crown is present */}
      {budgetEnabled && participant.price != null && (
        <div className={cn("absolute left-2.5 z-20", isTopRanked && !isEliminated ? "top-10" : "top-2.5")}>
          <Badge className="bg-amber-500 text-white text-[10px] font-bold border-0 px-2 py-0.5">
            {participant.price}
          </Badge>
        </div>
      )}

      {/* Photo */}
      <div className={cn("aspect-[3/4] relative overflow-hidden")}>
        {participant.photo_url ? (
          <img
            src={participant.photo_url}
            alt={participant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <User className="w-16 h-16 text-slate-400" />
          </div>
        )}
        {/* Light gradient overlay */}
        <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.25), transparent)' }} />
      </div>

      {/* Info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5 pb-4">
        {/* Role tag */}
        {participant.role && !isEliminated && participant.status !== "customized" && (
          <span className="inline-block text-[10px] tracking-wide uppercase font-semibold text-white mb-1">
            {participant.role}
          </span>
        )}

        {/* Name — no truncation */}
        <h3 className="text-sm sm:text-base font-bold text-white leading-tight break-words">
          {participant.name}
        </h3>

        {/* Score row */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn("text-lg font-black tabular-nums", scoreColor(totalPoints, false))}>
            {totalPoints > 0 ? "+" : ""}
            {totalPoints}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            {t("participants.total")}
          </span>
          <span className="text-slate-400">·</span>
          <span className={cn("text-xs font-semibold tabular-nums", scoreColor(gameweekPoints, false))}>
            {gameweekPoints > 0 ? "+" : ""}
            {gameweekPoints}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            {t("participants.gw")}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Participant Detail Modal ─── */
interface ParticipantDetailModalProps {
  participant: Participant | null;
  open: boolean;
  onClose: () => void;
  totalPoints: number;
  gameweekPoints: number;
  isEliminated: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const ParticipantDetailModal = ({
  participant,
  open,
  onClose,
  totalPoints,
  gameweekPoints,
  isEliminated,
  t,
}: ParticipantDetailModalProps) => {
  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "max-w-md p-0 gap-0 overflow-hidden rounded-2xl",
          "bg-slate-900/95 backdrop-blur-2xl",
          "shadow-2xl shadow-black/60",
          "border border-white/10",
          "animate-scale-in"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{participant.name}</DialogTitle>
        </DialogHeader>

        {/* Hero photo with fade */}
        <div className={cn("relative w-full aspect-[4/3] overflow-hidden", isEliminated && "grayscale-[60%]")}>
          {participant.photo_url ? (
            <img
              src={participant.photo_url}
              alt={participant.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <User className="w-24 h-24 text-stone-600" />
            </div>
          )}
          {/* Fade into glass panel */}
          <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.25), transparent)' }} />

          {/* Eliminated overlay */}
          {isEliminated && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold border-0 px-3 py-1">
                {t("participants.out")}
                {participant.eliminated_episode &&
                  ` — ${t("participants.inEpisode", { number: participant.eliminated_episode })}`}
              </Badge>
            </div>
          )}
        </div>

        {/* Content panel */}
        <div className="relative px-6 pb-6 -mt-12 z-10">
          {/* Dramatic score */}
          <div className="flex items-end gap-3 mb-4">
            <span
              className={cn(
                "text-5xl font-black tabular-nums tracking-tight",
                totalPoints > 0 ? "text-emerald-600" : totalPoints < 0 ? "text-red-600" : "text-slate-400"
              )}
            >
              {totalPoints > 0 ? "+" : ""}
              {totalPoints}
            </span>
            <div className="flex flex-col mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                {t("participants.total")}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    scoreBg(gameweekPoints),
                    "px-2 py-0.5 rounded-full border text-xs"
                  )}
                >
                  {gameweekPoints > 0 ? "+" : ""}
                  {gameweekPoints} {t("participants.gw")}
                </span>
              </div>
            </div>
          </div>

          {/* Name & role */}
          <h2 className="text-2xl font-bold text-white leading-tight">
            {participant.name}
            {participant.age && (
              <span className="text-gray-400 font-normal ml-2 text-lg">({participant.age})</span>
            )}
          </h2>

          {participant.role && (
            <span className="inline-block text-xs tracking-wide uppercase font-semibold text-[var(--show-primary)] mt-1">
              {participant.role}
            </span>
          )}

          {/* Custom status */}
          {!isEliminated && participant.status === "customized" && participant.custom_status_label && (
            <Badge className="bg-purple-500/80 text-white text-xs font-bold border-0 mt-2">
              {participant.custom_status_label}
            </Badge>
          )}

          {/* Hometown */}
          {participant.hometown && (
            <div className="flex items-center gap-1.5 mt-3 text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-sm">{participant.hometown}</span>
            </div>
          )}

          {/* Occupation */}
          {participant.occupation && (
            <p className="text-sm text-gray-300 mt-1 font-medium">{participant.occupation}</p>
          )}

          {/* Bio */}
          {participant.bio && (
            <p className="text-sm text-gray-400 leading-relaxed mt-4 border-t border-white/10 pt-4">
              {participant.bio}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Main Component ─── */

export const B2CParticipants = () => {
  const { t } = useTranslation();
  const { participants, show, episodes, events, settings } = useShow();
  const budgetEnabled = settings?.budget_mode_enabled ?? false;
  
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [participantPoints, setParticipantPoints] = useState<Record<string, { total: number; gw: number }>>({});
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselSnapCount, setCarouselSnapCount] = useState(0);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  // Fetch real points for all participants
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

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      setCarouselIndex(carouselApi.selectedScrollSnap());
      setCarouselSnapCount(carouselApi.scrollSnapList().length);
    };

    handleSelect();
    carouselApi.on("select", handleSelect);
    carouselApi.on("reInit", handleSelect);

    return () => {
      carouselApi.off("select", handleSelect);
      carouselApi.off("reInit", handleSelect);
    };
  }, [carouselApi]);

  const releasedParticipants = useMemo(
    () => participants.filter((p) => isParticipantReleased(p, { episodes, events })),
    [participants, episodes, events]
  );

  const filteredParticipants = useMemo(() => {
    return [...releasedParticipants];
  }, [releasedParticipants]);

  const shouldUseCarousel = filteredParticipants.length > 4;

  if (participants.length === 0) {
    return (
    <section className="relative py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">{t("participants.title")}</h2>
          <div className="text-center py-16 rounded-2xl bg-white border border-slate-200">
            <User className="w-16 h-16 text-stone-600 mx-auto mb-4" />
            <p className="text-slate-700 text-lg">{t("participants.noParticipants")}</p>
            <p className="text-slate-500 text-sm mt-2">{t("participants.checkBackSoon")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          ref={headerRef}
          className={cn(
            "text-center transition-all duration-70",
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h2 className="text-2xl text-white font-bold text-foreground mb-2">{t("participants.title")}</h2>
          <p className="text-sm text-white mb-8">Meet the contestants competing in this season</p>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className={cn(
            "transition-all duration-700 delay-100",
            gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {isLoadingPoints && (
            <div className="text-center py-4 text-slate-400 text-sm mb-4">
              {t("participants.loadingPoints")}
            </div>
          )}
          {shouldUseCarousel ? (
            <div className="relative">
              <Carousel
                opts={{ align: "start", containScroll: "trimSnaps", skipSnaps: false }}
                setApi={setCarouselApi}
                className="overflow-hidden"
              >
                <CarouselContent className="flex gap-4 pb-6">
                  {filteredParticipants.map((participant) => {
                    const isEliminated = getIsEliminated(participant);
                    return (
                      <CarouselItem
                        key={participant.id}
                        className="basis-[90%] sm:basis-[48%] md:basis-[32%] lg:basis-[25%]"
                      >
                        <ParticipantCard
                          participant={participant}
                          totalPoints={participantPoints[participant.id]?.total || 0}
                          gameweekPoints={participantPoints[participant.id]?.gw || 0}
                          isEliminated={isEliminated}
                          isTopRanked={false}
                          onClick={() => setSelectedParticipant(participant)}
                          t={t}
                          budgetEnabled={budgetEnabled}
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 text-slate-950 shadow-lg" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 text-slate-950 shadow-lg" />
              </Carousel>
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: carouselSnapCount || filteredParticipants.length }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(index)}
                    className={cn(
                      "h-3.5 w-3.5 rounded-full transition-all duration-200",
                      index === carouselIndex
                        ? "bg-white/30 hover:bg-white/60"
                        : "bg-white/30 hover:bg-white/60"
                    )}
                    style={index === carouselIndex ? { backgroundColor: 'var(--show-primary)' } : {}}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredParticipants.map((participant) => {
                const isEliminated = getIsEliminated(participant);
                return (
                  <ParticipantCard
                    key={participant.id}
                    participant={participant}
                    totalPoints={participantPoints[participant.id]?.total || 0}
                    gameweekPoints={participantPoints[participant.id]?.gw || 0}
                    isEliminated={isEliminated}
                    isTopRanked={false}
                    onClick={() => setSelectedParticipant(participant)}
                    t={t}
                    budgetEnabled={budgetEnabled}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <ParticipantDetailModal
          participant={selectedParticipant}
          open={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          totalPoints={
            selectedParticipant ? participantPoints[selectedParticipant.id]?.total || 0 : 0
          }
          gameweekPoints={
            selectedParticipant ? participantPoints[selectedParticipant.id]?.gw || 0 : 0
          }
          isEliminated={selectedParticipant ? getIsEliminated(selectedParticipant) : false}
          t={t}
        />
      </div>
    </section>
  );
};
