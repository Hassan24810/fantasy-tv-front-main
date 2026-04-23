import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Episode } from "@/hooks/useEpisodes";
import { Film, Loader2, Users, Plus, Minus } from "lucide-react";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useRules } from "@/hooks/useRules";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatEventDisplayText,
  parsePointsPerPosition,
  type EventParticipantData,
} from "@/lib/eventDisplayUtils";

interface AddEpisodeEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: Episode | null;
  onEventAdded?: () => void;
}

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
}

export function AddEpisodeEventSheet({ open, onOpenChange, episode, onEventAdded }: AddEpisodeEventSheetProps) {
  const { t, i18n } = useTranslation();
  const { show } = useAdminShow();
  const { rules } = useRules({ showId: show?.id });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [offsetHours, setOffsetHours] = useState("0");
  const [offsetMinutes, setOffsetMinutes] = useState("0");
  const [offsetSeconds, setOffsetSeconds] = useState("0");
  const [ruleId, setRuleId] = useState("");
  const [notes, setNotes] = useState("");

  // Participant slots - order matters for position-based points
  const [participantSlots, setParticipantSlots] = useState<(string | null)[]>([null]);

  // Fetch participants for this show
  useEffect(() => {
    async function fetchParticipants() {
      if (!show?.id) {
        setParticipants([]);
        return;
      }

      const { data, error } = await supabase
        .from("participants")
        .select("id, name, photo_url, status")
        .eq("show_id", show.id)
        .not("status", "eq", "inactive")
        .order("name");

      if (error) {
        console.error("Error fetching participants:", error);
        setParticipants([]);
      } else {
        setParticipants(data || []);
      }
    }

    if (open) {
      fetchParticipants();
    }
  }, [show?.id, open]);

  const selectedRule = rules.find((r) => r.id === ruleId);

  const tKey = (key: string, options?: any) => t(key, options);
  const locale = i18n.language || undefined;

  // Parse points per position from selected rule
  const pointsPerPosition = useMemo(() => {
    if (!selectedRule) return [];
    return parsePointsPerPosition(selectedRule.pointsPerPosition);
  }, [selectedRule]);

  // Get required participant count based on rule configuration
  const requiredParticipantCount = useMemo(() => {
    if (!selectedRule) return 1;
    if (selectedRule.participantCountMode === "variable") return null; // Variable mode
    return selectedRule.participantsCount;
  }, [selectedRule]);

  const isVariableMode = selectedRule?.participantCountMode === "variable";
  const maxParticipants = isVariableMode ? 10 : (requiredParticipantCount || 1);
  const minParticipants = isVariableMode ? 1 : (requiredParticipantCount || 1);

  // Handle rule change - reset participant slots based on rule config
  const handleRuleChange = (newRuleId: string) => {
    setRuleId(newRuleId);
    const rule = rules.find(r => r.id === newRuleId);
    
    if (rule) {
      if (rule.participantCountMode === "variable") {
        // Variable mode - start with 1 slot
        setParticipantSlots([null]);
      } else {
        // Exact mode - set exact number of slots
        setParticipantSlots(Array(rule.participantsCount).fill(null));
      }
    } else {
      setParticipantSlots([null]);
    }
  };

  // Add participant slot (variable mode only)
  const handleAddParticipant = () => {
    if (participantSlots.length < maxParticipants) {
      setParticipantSlots([...participantSlots, null]);
    }
  };

  // Remove participant slot (variable mode only)
  const handleRemoveParticipant = (index: number) => {
    if (participantSlots.length > minParticipants) {
      const newSlots = participantSlots.filter((_, i) => i !== index);
      setParticipantSlots(newSlots);
    }
  };

  // Handle slot selection
  const handleSlotChange = (index: number, participantId: string | null) => {
    const newSlots = [...participantSlots];
    newSlots[index] = participantId;
    setParticipantSlots(newSlots);
  };

  // Get available participants for a slot (exclude already selected)
  const getAvailableParticipants = (slotIndex: number) => {
    const selectedInOtherSlots = participantSlots
      .filter((_, i) => i !== slotIndex)
      .filter(Boolean) as string[];
    return participants.filter(p => !selectedInOtherSlots.includes(p.id));
  };

  // Get points for a specific position
  const getPointsForPosition = (position: number): number => {
    if (pointsPerPosition.length === 0) return selectedRule?.points || 0;
    // For variable mode, use the last value for positions beyond the array
    if (position <= pointsPerPosition.length) {
      return pointsPerPosition[position - 1];
    }
    return pointsPerPosition[pointsPerPosition.length - 1] || 0;
  };

  // Validation
  const selectedParticipantIds = participantSlots.filter(Boolean) as string[];
  const hasDuplicates = selectedParticipantIds.length !== new Set(selectedParticipantIds).size;
  const hasAllRequired = !isVariableMode 
    ? selectedParticipantIds.length === requiredParticipantCount 
    : selectedParticipantIds.length >= 1;

  // Build preview data for formatEventDisplayText
  const previewParticipants: EventParticipantData[] = useMemo(() => {
    return participantSlots.map((slotId, index) => {
      const participant = participants.find((p) => p.id === slotId);
      return {
        name: participant?.name || t("admin.participantNumber", { number: index + 1 }),
        points: getPointsForPosition(index + 1),
        position: index + 1,
      };
    });
  }, [participantSlots, participants, pointsPerPosition, selectedRule, t, i18n.language]);

  // Generate preview text using the utility
  const previewText = useMemo(() => {
    if (!selectedRule) return "";
    return formatEventDisplayText(selectedRule.template, previewParticipants);
  }, [selectedRule, previewParticipants]);

  const resetForm = () => {
    setOffsetHours("0");
    setOffsetMinutes("0");
    setOffsetSeconds("0");
    setRuleId("");
    setParticipantSlots([null]);
    setNotes("");
  };

  const handleSubmit = async () => {
    // Validation
    if (!ruleId || selectedParticipantIds.length === 0) {
      toast({
        title: t("toast.validationError"),
        description: t("admin.validationSelectRuleAndParticipant"),
        variant: "destructive",
      });
      return;
    }

    if (!hasAllRequired) {
      toast({
        title: t("toast.validationError"),
        description: t("admin.validationExactParticipants", { count: requiredParticipantCount }),
        variant: "destructive",
      });
      return;
    }

    if (hasDuplicates) {
      toast({
        title: t("toast.validationError"),
        description: t("admin.validationDuplicateParticipants"),
        variant: "destructive",
      });
      return;
    }

    if (!show?.id || !episode?.episodeNumber) {
      toast({
        title: t("toast.error"),
        description: t("admin.validationNoShowOrEpisode"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Convert hours, minutes, seconds to total seconds
    const totalOffsetSeconds =
      (parseInt(offsetHours) || 0) * 3600 + (parseInt(offsetMinutes) || 0) * 60 + (parseInt(offsetSeconds) || 0);

    try {
      // Use RPC for atomic event creation
      const { data: result, error } = await supabase.rpc("create_event_with_participants", {
        p_show_id: show.id,
        p_episode_number: episode.episodeNumber,
        p_rule_id: ruleId,
        p_participant_ids: selectedParticipantIds,
        p_event_date: null,
        p_notes: notes || null,
        p_event_offset_seconds: totalOffsetSeconds,
      });

      if (error) {
        console.error("Error creating event:", error);
        toast({
          title: t("toast.failed"),
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const response = result as { success: boolean; error?: string; event_id?: string };
      if (!response.success) {
        toast({
          title: t("toast.failed"),
          description: response.error || t("toast.errorOccurred"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("toast.eventCreated"),
        description: t("admin.eventAddedWithParticipants", { count: selectedParticipantIds.length }),
      });

      resetForm();
      onOpenChange(false);

      if (onEventAdded) {
        onEventAdded();
      }
    } catch (err) {
      console.error("Unexpected error creating event:", err);
      toast({
        title: t("toast.error"),
        description: t("toast.errorOccurred"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-white border-slate-200 overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b border-slate-200">
          <SheetTitle className="text-xl font-semibold text-slate-900">
            {t("admin.addEvent")}
          </SheetTitle>
          <SheetDescription className="text-slate-600">
            <span className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              {t("admin.addingToEpisode", {
                number: episode?.episodeNumber,
                name: episode?.episodeName,
              })}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Event Offset - Hours, Minutes, Seconds */}
          <div className="space-y-2">
            <Label className="text-slate-900 font-medium">
              {t("admin.whenDoesThisHappen")} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  id="offsetHours"
                  type="number"
                  min="0"
                  max="99"
                  placeholder="0"
                  value={offsetHours}
                  onChange={(e) => setOffsetHours(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center mt-1">{t("admin.time.hoursShort")}</p>
              </div>
              <span className="text-slate-500 font-medium">:</span>
              <div className="flex-1">
                <Input
                  id="offsetMinutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={offsetMinutes}
                  onChange={(e) => setOffsetMinutes(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center mt-1">{t("admin.time.minutesShort")}</p>
              </div>
              <span className="text-slate-500 font-medium">:</span>
              <div className="flex-1">
                <Input
                  id="offsetSeconds"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={offsetSeconds}
                  onChange={(e) => setOffsetSeconds(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center mt-1">{t("admin.time.secondsShort")}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.eventOffsetHelp")}</p>
          </div>

          {/* Event Rule Selection */}
          <div className="space-y-2">
            <Label className="text-slate-900 font-medium">
              {t("admin.eventRule")} <span className="text-destructive">*</span>
            </Label>
            <Select value={ruleId} onValueChange={handleRuleChange}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue
                  placeholder={
                    rules.length === 0 ? t("admin.noRulesConfigured") : t("admin.selectRule")
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {rules.map((rule) => {
                  const rulePoints = parsePointsPerPosition(rule.pointsPerPosition);
                  const pointsDisplay =
                    rulePoints.length > 0
                      ? rulePoints.map((p, i) => `P${i + 1}: ${p > 0 ? "+" : ""}${p}`).join(", ")
                      : t("admin.pointsWithUnit", { points: rule.points });

                  return (
                    <SelectItem key={rule.id} value={rule.id} className="text-slate-900">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          {rule.title}
                          {rule.participantsCount > 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Users className="h-3 w-3 mr-0.5" />
                              {rule.participantCountMode === "variable"
                                ? `${rule.participantsCount}+`
                                : rule.participantsCount}
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{pointsDisplay}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("admin.addRulesBeforeEvents")}</p>
            )}
          </div>

          {/* Participant Slots */}
          {selectedRule && (
            <div className="space-y-3">
              <Label className="text-slate-900 font-medium flex items-center justify-between">
                <span>
                  {t("admin.participants")} <span className="text-destructive">*</span>
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {t("admin.selectedCount", {
                    selected: selectedParticipantIds.length,
                    required: isVariableMode ? `${minParticipants}+` : requiredParticipantCount,
                  })}
                </span>
              </Label>

              <div className="space-y-2">
                {participantSlots.map((slotValue, index) => {
                  const available = getAvailableParticipants(index);
                  const selectedParticipant = participants.find((p) => p.id === slotValue);
                  const positionPoints = getPointsForPosition(index + 1);

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          {t("admin.position", { number: index + 1 })}
                          <Badge
                            variant={positionPoints >= 0 ? "default" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {positionPoints > 0 ? "+" : ""}
                            {positionPoints} {t("admin.pointsShort")}
                          </Badge>
                        </Label>
                        {isVariableMode && participantSlots.length > minParticipants && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveParticipant(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select value={slotValue || ""} onValueChange={(val) => handleSlotChange(index, val || null)}>
                        <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                          <SelectValue placeholder={t("admin.selectParticipant")}>
                            {selectedParticipant && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={selectedParticipant.photo_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {selectedParticipant.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{selectedParticipant.name}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {available.map((participant) => (
                            <SelectItem key={participant.id} value={participant.id} className="text-slate-900">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={participant.photo_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {participant.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{participant.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>

              {isVariableMode && participantSlots.length < maxParticipants && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddParticipant}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("admin.addParticipant")}
                </Button>
              )}

              {hasDuplicates && (
                <p className="text-xs text-destructive">{t("admin.validationDuplicateParticipants")}</p>
              )}

              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("admin.noParticipantsAvailable")}</p>
              )}
            </div>
          )}

          {/* Live Preview */}
          {selectedRule && selectedParticipantIds.length > 0 && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4 space-y-3">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">
                  {t("admin.livePreview")}
                </Label>
                <p className="text-slate-900 font-medium">{previewText}</p>

                {/* Points breakdown */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  {previewParticipants
                    .filter((p) => participantSlots[p.position - 1])
                    .map((p) => (
                      <Badge
                        key={p.position}
                        variant={p.points >= 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {p.name}: {p.points > 0 ? "+" : ""}
                        {p.points}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-900 font-medium">
              {t("admin.notesOptional")}
            </Label>
            <Input
              id="notes"
              type="text"
              placeholder={t("admin.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Button variant="outline" onClick={handleDiscard} className="border-slate-200 text-slate-700">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !ruleId || !hasAllRequired || hasDuplicates}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("admin.addEvent")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
