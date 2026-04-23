import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, timeToSeconds, secondsToTime } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Episode } from "@/hooks/useEpisodes";

interface EditEpisodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: Episode | null;
  onUpdate?: (id: string, data: Partial<Omit<Episode, "id" | "createdAt">>) => Promise<boolean | undefined>;
}

export function EditEpisodeSheet({ open, onOpenChange, episode, onUpdate }: EditEpisodeSheetProps) {
  const { t } = useTranslation();
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [episodeName, setEpisodeName] = useState("");
  const [durationHours, setDurationHours] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("0");
  const [durationSeconds, setDurationSeconds] = useState("0");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("20:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (episode) {
      setEpisodeNumber(episode.episodeNumber.toString());
      setEpisodeName(episode.episodeName);
      
      // Convert seconds to H:M:S
      const time = secondsToTime(episode.durationSeconds || 3600);
      setDurationHours(time.hours.toString());
      setDurationMinutes(time.minutes.toString());
      setDurationSeconds(time.seconds.toString());
      
      if (episode.activeFromDateTime) {
        const date = new Date(episode.activeFromDateTime);
        setScheduledDate(date);
        setScheduledTime(format(date, "HH:mm"));
      } else {
        setScheduledDate(undefined);
        setScheduledTime("20:00");
      }
    }
  }, [episode]);

  const handleSubmit = async () => {
    if (!episodeNumber || !episodeName || !episode) {
      toast({
        title: t("common.validationError"),
        description: t("admin.episodeNumberNameRequired"),
        variant: "destructive",
      });
      return;
    }

    const totalSeconds = timeToSeconds(
      parseInt(durationHours) || 0,
      parseInt(durationMinutes) || 0,
      parseInt(durationSeconds) || 0
    );

    if (totalSeconds < 1 || totalSeconds > 18000) {
      toast({
        title: t("common.validationError"),
        description: t("admin.durationValidation"),
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: t("common.validationError"),
        description: t("admin.scheduledDateTimeRequired"),
        variant: "destructive",
      });
      return;
    }

    const activeFromDateTime = new Date(`${format(scheduledDate, "yyyy-MM-dd")}T${scheduledTime}:00`).toISOString();
    const startDate = new Date(activeFromDateTime);
    const activeUntilDateTime = new Date(startDate.getTime() + totalSeconds * 1000).toISOString();

    const episodeData = {
      episodeNumber: parseInt(episodeNumber),
      episodeName,
      durationSeconds: totalSeconds,
      isActive: false,
      activeFromDateTime,
      activeUntilDateTime,
    };

    if (onUpdate) {
      setIsSubmitting(true);
      await onUpdate(episode.id, episodeData);
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-white border-slate-200 overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b border-slate-200">
          <SheetTitle className="text-xl font-semibold text-slate-900">
            {t("episodes.editEpisode")}
          </SheetTitle>
          <SheetDescription className="text-slate-500">
            {t("admin.editEpisodeDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Episode Number */}
          <div className="space-y-2">
            <Label htmlFor="episodeNumber" className="text-slate-900 font-medium">
              {t("episodes.episodeNumber")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="episodeNumber"
              type="number"
              min="1"
              placeholder={t("admin.enterEpisodeNumber")}
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(e.target.value)}
            />
          </div>

          {/* Episode Name */}
          <div className="space-y-2">
            <Label htmlFor="episodeName" className="text-slate-900 font-medium">
              {t("episodes.episodeName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="episodeName"
              placeholder={t("episodes.enterEpisodeName")}
              value={episodeName}
              onChange={(e) => setEpisodeName(e.target.value)}
            />
          </div>

          {/* Episode Duration - HH:MM:SS */}
          <div className="space-y-2">
            <Label className="text-slate-900 font-medium">
              {t("episodes.duration")} <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-durationHours" className="text-xs text-slate-500">{t("episodes.hours")}</Label>
                <Input
                  id="edit-durationHours"
                  type="number"
                  min="0"
                  max="5"
                  placeholder="1"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-durationMinutes" className="text-xs text-slate-500">{t("episodes.minutes")}</Label>
                <Input
                  id="edit-durationMinutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-durationSeconds" className="text-xs text-slate-500">{t("episodes.seconds")}</Label>
                <Input
                  id="edit-durationSeconds"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {t("admin.durationDescription")}
            </p>
          </div>

          {/* Scheduled Date/Time */}
          <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="space-y-2">
              <Label className="text-slate-900 font-medium">
                {t("episodes.activationDate")} <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white border-slate-200",
                      !scheduledDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : t("forms.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-slate-200" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-900 font-medium">
                {t("episodes.activationTime")} <span className="text-destructive">*</span>
              </Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={handleDiscard}
            className="flex-1 border-slate-200 text-slate-900 hover:bg-slate-50"
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("forms.saving") : t("common.saveChanges")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}