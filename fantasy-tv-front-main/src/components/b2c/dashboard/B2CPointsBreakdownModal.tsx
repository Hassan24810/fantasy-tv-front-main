import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PointsEvent } from "@/hooks/useUserPointsBreakdown";
import { formatEventDisplayText } from "@/lib/eventDisplayUtils";
import { RuleIconOnly } from "@/components/ui/RuleIcon";
import { useTranslation } from "react-i18next";

type TabValue = "gameweek" | "alltime";

interface B2CPointsBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: PointsEvent[];
  gameweekEpisodeNumber: number | null;
  totalPoints: number;
  gameweekPoints: number;
  defaultTab?: TabValue;
}

export const B2CPointsBreakdownModal = ({
  open,
  onOpenChange,
  events,
  gameweekEpisodeNumber,
  totalPoints,
  gameweekPoints,
  defaultTab = "gameweek",
}: B2CPointsBreakdownModalProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  // Reset to default tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Filter events for gameweek tab
  const gameweekEvents = useMemo(() => {
    if (!gameweekEpisodeNumber) return [];
    return events.filter((e) => e.episode_number === gameweekEpisodeNumber);
  }, [events, gameweekEpisodeNumber]);

  // Group events by episode for total tab (descending order)
  const eventsByEpisode = useMemo(() => {
    const grouped: Record<number, PointsEvent[]> = {};
    events.forEach((event) => {
      if (!grouped[event.episode_number]) {
        grouped[event.episode_number] = [];
      }
      grouped[event.episode_number].push(event);
    });
    // Sort by episode number descending
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([episodeNumber, episodeEvents]) => ({
        episodeNumber: Number(episodeNumber),
        events: episodeEvents.sort(
          (a, b) => a.event_offset_minutes - b.event_offset_minutes
        ),
        subtotal: episodeEvents.reduce((sum, e) => sum + e.event_points_earned, 0),
      }));
  }, [events]);

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const renderEventRow = (event: PointsEvent) => {
    // Format display text using all participants for full context
    const displayText = formatEventDisplayText(
      event.rule_template,
      event.all_event_participants.map((p) => ({
        name: p.participant_name,
        points: p.points_awarded,
        position: p.position,
      }))
    );

    const pointsClass =
      event.event_points_earned >= 0 ? "text-green-600" : "text-red-600";

    return (
      <div
        key={event.event_id}
        className="flex items-start gap-3 py-3 border-b border-border last:border-b-0"
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <RuleIconOnly icon={event.rule_icon} className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm text-foreground truncate">
              {event.rule_name}
            </p>
            <span className={`font-semibold text-sm ${pointsClass} flex-shrink-0`}>
              {event.event_points_earned >= 0 ? "+" : ""}
              {event.event_points_earned}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{displayText}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {formatTime(event.event_offset_minutes)}
          </p>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="py-8 text-center text-muted-foreground text-sm">
      {t('points.noPointsEarned')}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('points.breakdown')}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gameweek" className="text-sm">
              {t('points.thisGameweek')}
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({gameweekPoints >= 0 ? "+" : ""}{gameweekPoints})
              </span>
            </TabsTrigger>
            <TabsTrigger value="alltime" className="text-sm">
              {t('points.allTime')}
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({totalPoints >= 0 ? "+" : ""}{totalPoints})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="gameweek"
            className="flex-1 overflow-y-auto mt-4 -mx-2 px-2"
          >
            {gameweekEvents.length > 0 ? (
              <div className="space-y-0">
                {gameweekEvents
                  .sort((a, b) => a.event_offset_minutes - b.event_offset_minutes)
                  .map(renderEventRow)}
              </div>
            ) : (
              renderEmptyState()
            )}
          </TabsContent>

          <TabsContent
            value="alltime"
            className="flex-1 overflow-y-auto mt-4 -mx-2 px-2"
          >
            {eventsByEpisode.length > 0 ? (
              <div className="space-y-4">
                {eventsByEpisode.map(({ episodeNumber, events: episodeEvents, subtotal }) => (
                  <div key={episodeNumber}>
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-white py-1">
                      <span className="font-medium text-sm text-foreground">
                        {t('points.episode')} {episodeNumber}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          subtotal >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {subtotal >= 0 ? "+" : ""}{subtotal} {t('points.pts')}
                      </span>
                    </div>
                    <div className="space-y-0">
                      {episodeEvents.map(renderEventRow)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              renderEmptyState()
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
