import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Episode } from "@/hooks/useEpisodes";
import type { EpisodeEvent } from "@/components/admin/EpisodeDetailDrawer";
import { Film, Loader2, Users, Plus, Minus } from "lucide-react";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useRules } from "@/hooks/useRules";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { 
  formatEventDisplayText, 
  parsePointsPerPosition,
  type EventParticipantData 
} from "@/lib/eventDisplayUtils";

interface EditEpisodeEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EpisodeEvent | null;
  episode: Episode | null;
  onEventUpdated?: () => void;
}

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
}

export function EditEpisodeEventSheet({ 
  open, 
  onOpenChange, 
  event, 
  episode,
  onEventUpdated 
}: EditEpisodeEventSheetProps) {
  const { t } = useTranslation();
  const { show } = useAdminShow();
  const { rules } = useRules({ showId: show?.id });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [offsetHours, setOffsetHours] = useState("0");
  const [offsetMinutes, setOffsetMinutes] = useState("0");
  const [offsetSeconds, setOffsetSeconds] = useState("0");
  const [ruleId, setRuleId] = useState("");
  const [notes, setNotes] = useState("");
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
        .select("id, name, photo_url")
        .eq("show_id", show.id)
        .eq("status", "active")
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

  useEffect(() => {
    if (event && open) {
      // Convert offset to hours, minutes, seconds
      // event.eventOffsetSeconds is in seconds, fallback to eventOffsetMinutes * 60
      const totalSeconds = event.eventOffsetSeconds || (event.eventOffsetMinutes || 0) * 60;
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      
      setOffsetHours(String(hours));
      setOffsetMinutes(String(mins));
      setOffsetSeconds(String(secs));
      
      // Set rule ID
      setRuleId(event.ruleId || "");
      
      // Set notes
      setNotes(event.notes || "");
      
      // Set participant slots from event participants (sorted by position)
      if (event.participants && event.participants.length > 0) {
        const sortedParticipants = [...event.participants].sort((a, b) => a.position - b.position);
        const slots = sortedParticipants.map(p => p.participant_id);
        setParticipantSlots(slots);
      } else {
        setParticipantSlots([null]);
      }
    }
  }, [event, open]);

  const selectedRule = rules.find(r => r.id === ruleId);
  
  // Parse points per position from selected rule
  const pointsPerPosition = useMemo(() => {
    if (!selectedRule) return [];
    return parsePointsPerPosition(selectedRule.pointsPerPosition);
  }, [selectedRule]);

  // Get required participant count based on rule configuration
  const requiredParticipantCount = useMemo(() => {
    if (!selectedRule) return 1;
    if (selectedRule.participantCountMode === "variable") return null;
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
        // Variable mode - keep existing slots or start with 1
        if (participantSlots.length === 0) {
          setParticipantSlots([null]);
        }
      } else {
        // Exact mode - adjust to exact number of slots
        const newSlotCount = rule.participantsCount;
        const newSlots = Array(newSlotCount).fill(null).map((_, i) => 
          participantSlots[i] || null
        );
        setParticipantSlots(newSlots);
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
      const participant = participants.find(p => p.id === slotId);
      return {
        name: participant?.name || `${t('admin.participants')} ${index + 1}`,
        points: getPointsForPosition(index + 1),
        position: index + 1,
      };
    });
  }, [participantSlots, participants, pointsPerPosition, selectedRule, t]);

  // Generate preview text using the utility
  const previewText = useMemo(() => {
    if (!selectedRule) return "";
    return formatEventDisplayText(selectedRule.template, previewParticipants);
  }, [selectedRule, previewParticipants]);

  const handleSubmit = async () => {
    // Validation
    if (!ruleId || selectedParticipantIds.length === 0) {
      toast({
        title: t('common.validationError'),
        description: t('admin.selectRuleAndParticipant'),
        variant: "destructive",
      });
      return;
    }

    if (!hasAllRequired) {
      toast({
        title: t('common.validationError'),
        description: t('admin.ruleRequiresParticipants', { count: requiredParticipantCount }),
        variant: "destructive",
      });
      return;
    }

    if (hasDuplicates) {
      toast({
        title: t('common.validationError'),
        description: t('admin.duplicateParticipants'),
        variant: "destructive",
      });
      return;
    }

    if (!event?.id) {
      toast({
        title: t('toast.error'),
        description: t('admin.noEventSelected'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Convert hours, minutes, seconds to total seconds
    const totalOffsetSeconds = 
      (parseInt(offsetHours) || 0) * 3600 + 
      (parseInt(offsetMinutes) || 0) * 60 + 
      (parseInt(offsetSeconds) || 0);

    try {
      // Use RPC for atomic event update
      const { data: result, error } = await supabase.rpc("update_event_with_participants", {
        p_event_id: event.id,
        p_rule_id: ruleId,
        p_participant_ids: selectedParticipantIds,
        p_event_offset_seconds: totalOffsetSeconds,
        p_notes: notes || null,
      });

      if (error) {
        console.error("Error updating event:", error);
        toast({
          title: t('toast.failed'),
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const response = result as { success: boolean; error?: string; event_id?: string };
      if (!response.success) {
        toast({
          title: t('toast.failed'),
          description: response.error || t('toast.errorOccurred'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('toast.eventUpdated'),
        description: t('admin.eventUpdatedWithParticipants', { count: selectedParticipantIds.length }),
      });
      
      onOpenChange(false);
      
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (err) {
      console.error("Unexpected error updating event:", err);
      toast({
        title: t('toast.error'),
        description: t('toast.pleaseTryAgain'),
        variant: "destructive",
      });
    } finally {
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
            {t('admin.editEvent')}
          </SheetTitle>
          <SheetDescription className="text-slate-600">
            <span className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              {t('events.episodeNumber', { number: episode?.episodeNumber })}: {episode?.episodeName}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Event Offset - Hours, Minutes, Seconds */}
          <div className="space-y-2">
            <Label className="text-slate-900 font-medium">
              {t('admin.whenDoesThisHappen')} <span className="text-destructive">*</span>
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
                <p className="text-xs text-muted-foreground text-center mt-1">{t('common.hours')}</p>
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
                <p className="text-xs text-muted-foreground text-center mt-1">{t('common.min')}</p>
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
                <p className="text-xs text-muted-foreground text-center mt-1">{t('common.sec')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.revealTimeDescription')}
            </p>
          </div>

          {/* Event Rule Selection */}
          <div className="space-y-2">
            <Label className="text-slate-900 font-medium">
              {t('admin.eventRule')} <span className="text-destructive">*</span>
            </Label>
            <Select value={ruleId} onValueChange={handleRuleChange}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue placeholder={rules.length === 0 ? t('admin.noRulesConfigured') : t('admin.selectARule')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {rules.map((rule) => {
                  const rulePoints = parsePointsPerPosition(rule.pointsPerPosition);
                  const pointsDisplay = rulePoints.length > 0 
                    ? rulePoints.map((p, i) => `P${i+1}: ${p > 0 ? '+' : ''}${p}`).join(', ')
                    : `${rule.points} pts`;
                  
                  return (
                    <SelectItem key={rule.id} value={rule.id} className="text-slate-900">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          {rule.title}
                          {rule.participantsCount > 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Users className="h-3 w-3 mr-0.5" />
                              {rule.participantCountMode === "variable" ? `${rule.participantsCount}+` : rule.participantsCount}
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
          </div>

          {/* Participant Slots */}
          {selectedRule && (
            <div className="space-y-3">
              <Label className="text-slate-900 font-medium flex items-center justify-between">
                <span>
                  {t('admin.participants')} <span className="text-destructive">*</span>
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedParticipantIds.length} / {isVariableMode ? `${minParticipants}+` : requiredParticipantCount} {t('admin.selected')}
                </span>
              </Label>
              
              <div className="space-y-2">
                {participantSlots.map((slotValue, index) => {
                  const available = getAvailableParticipants(index);
                  const selectedParticipant = participants.find(p => p.id === slotValue);
                  const positionPoints = getPointsForPosition(index + 1);
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          {t('admin.position', { number: index + 1 })}
                          <Badge 
                            variant={positionPoints >= 0 ? "default" : "destructive"} 
                            className="text-[10px] px-1.5 py-0"
                          >
                            {positionPoints > 0 ? '+' : ''}{positionPoints} pts
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
                      <Select
                        value={slotValue || ""}
                        onValueChange={(val) => handleSlotChange(index, val || null)}
                      >
                        <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                          <SelectValue placeholder={t('events.selectParticipants')}>
                            {selectedParticipant && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={selectedParticipant.photo_url || ""} />
                                  <AvatarFallback className="text-[10px]">
                                    {selectedParticipant.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {selectedParticipant.name}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {available.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-slate-900">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={p.photo_url || ""} />
                                  <AvatarFallback className="text-[10px]">
                                    {p.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {p.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}

                {/* Add Participant Button (variable mode) */}
                {isVariableMode && participantSlots.length < maxParticipants && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddParticipant}
                    className="w-full mt-2 border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.addParticipant')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-slate-900 font-medium">{t('events.notes')}</Label>
            <Textarea
              placeholder={t('events.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 resize-none"
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedRule && previewText && (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <Label className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                  {t('admin.livePreview')}
                </Label>
                <p className="text-slate-900 mt-2">{previewText}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleDiscard} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !ruleId || !hasAllRequired || hasDuplicates}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('forms.saving')}
              </>
            ) : (
              t('common.saveChanges')
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
