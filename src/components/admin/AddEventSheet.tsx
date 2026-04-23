import { useState, useMemo, useEffect } from "react";
import { HelpCircle, Users, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useRules } from "@/hooks/useRules";
import { useEvents } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Participant {
  id: string;
  name: string;
  status: string;
  photo_url: string | null;
}

export function AddEventSheet({ open, onOpenChange }: AddEventSheetProps) {
  const { t } = useTranslation();
  const { show } = useAdminShow();
  const { episodes } = useEpisodes({ showId: show?.id });
  const { rules } = useRules({ showId: show?.id });
  const { createEvent } = useEvents();
  
  const [episodeNumber, setEpisodeNumber] = useState<string>("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multi-participant mode
  const [isMultiParticipant, setIsMultiParticipant] = useState(false);
  const [participantCount, setParticipantCount] = useState(2);
  const [participantSlots, setParticipantSlots] = useState<(string | null)[]>([null, null]);

  // Fetch participants for the show
  useEffect(() => {
    async function fetchParticipants() {
      if (!show?.id) return;
      
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, status, photo_url")
        .eq("show_id", show.id)
        .eq("status", "active")
        .order("name");

      if (error) {
        console.error("Error fetching participants:", error);
        return;
      }

      setParticipants(data || []);
    }

    if (open) {
      fetchParticipants();
    }
  }, [show?.id, open]);

  const selectedRule = rules.find((r) => r.id === ruleId);
  
  // Determine max participants based on rule or default to 10
  const maxParticipants = selectedRule?.participantsCount || 10;

  // Handle rule change - reset participant selection
  const handleRuleChange = (newRuleId: string) => {
    setRuleId(newRuleId);
    const rule = rules.find(r => r.id === newRuleId);
    
    // If rule has participantsCount > 1, auto-enable multi-participant mode
    if (rule && rule.participantsCount > 1) {
      setIsMultiParticipant(true);
      setParticipantCount(rule.participantsCount);
      setParticipantSlots(Array(rule.participantsCount).fill(null));
    } else {
      setIsMultiParticipant(false);
      setParticipantCount(2);
      setParticipantSlots([null, null]);
    }
  };

  // Handle multi-participant toggle
  const handleMultiParticipantToggle = (checked: boolean) => {
    setIsMultiParticipant(checked);
    if (checked) {
      // Start with 2 slots when enabling multi-participant
      setParticipantSlots([participantSlots[0] || null, null]);
    } else {
      // Keep only the first selection
      setParticipantSlots([participantSlots[0] || null]);
    }
  };

  // Add another participant slot
  const handleAddParticipant = () => {
    if (participantSlots.length < maxParticipants) {
      setParticipantSlots([...participantSlots, null]);
    }
  };

  // Remove a participant slot
  const handleRemoveParticipant = (index: number) => {
    if (participantSlots.length > (isMultiParticipant ? 2 : 1)) {
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

  // Generate preview text
  const previewText = useMemo(() => {
    const selectedIds = participantSlots.filter(Boolean) as string[];
    if (!selectedRule || selectedIds.length === 0) return "";
    
    const selectedNames = selectedIds
      .map(id => participants.find(p => p.id === id)?.name || t('common.unknown'))
      .map(name => `${name} (${selectedRule.points >= 0 ? '+' : ''}${selectedRule.points} ${t('common.points')})`)
      .join(", ");
    
    return `${selectedRule.title}: ${selectedNames}`;
  }, [selectedRule, participantSlots, participants, t]);

  // Validation
  const selectedParticipantIds = participantSlots.filter(Boolean) as string[];
  const isValid = episodeNumber && ruleId && selectedParticipantIds.length >= 1;
  const hasDuplicates = selectedParticipantIds.length !== new Set(selectedParticipantIds).size;

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error(t('toast.fillRequired'));
      return;
    }

    if (hasDuplicates) {
      toast.error(t('admin.duplicateParticipants'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Combine date and time
      let eventDateTime: string | undefined;
      if (eventDate) {
        eventDateTime = eventTime 
          ? `${eventDate}T${eventTime}:00`
          : `${eventDate}T00:00:00`;
      }

      await createEvent.mutateAsync({
        episode_number: parseInt(episodeNumber),
        rule_id: ruleId,
        participant_ids: selectedParticipantIds,
        event_date: eventDateTime,
        notes: notes || undefined,
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEpisodeNumber("");
    setEventDate("");
    setEventTime("");
    setRuleId("");
    setIsMultiParticipant(false);
    setParticipantCount(2);
    setParticipantSlots([null]);
    setNotes("");
  };

  const handleDiscard = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] bg-white border-slate-200 overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold text-slate-900">{t('events.addEvent')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Episode Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium text-slate-700">{t('events.episode')} *</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('admin.selectEpisodeTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={episodeNumber} onValueChange={setEpisodeNumber}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue placeholder={t('toast.selectEpisode')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {episodes.map((ep) => (
                  <SelectItem key={ep.id} value={ep.episodeNumber.toString()} className="text-slate-900">
                    {t('events.episodeNumber', { number: ep.episodeNumber })}: {ep.episodeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-sm font-medium text-slate-700">{t('forms.selectDate')}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('admin.eventDateTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-sm font-medium text-slate-700">{t('forms.selectTime')}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('admin.eventTimeTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>

          {/* Event Rule */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium text-slate-700">{t('admin.eventRule')} *</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('admin.eventRuleTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={ruleId} onValueChange={handleRuleChange}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue placeholder={t('events.selectRule')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id} className="text-slate-900">
                    <span className="flex items-center gap-2">
                      {rule.title} ({rule.points >= 0 ? '+' : ''}{rule.points} {t('points.pts')})
                      {rule.participantsCount > 1 && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {rule.participantsCount}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-Participant Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <Label className="text-sm font-medium text-slate-700 cursor-pointer">
                {t('admin.multiParticipantEvent')}
              </Label>
            </div>
            <Switch
              checked={isMultiParticipant}
              onCheckedChange={handleMultiParticipantToggle}
              disabled={selectedRule && selectedRule.participantsCount > 1}
            />
          </div>

          {/* Participant Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">
                {isMultiParticipant ? t('participants.title') + " *" : t('admin.participant') + " *"}
              </Label>
              <span className="text-xs text-slate-500">
                {selectedParticipantIds.length} {t('admin.selected')}
              </span>
            </div>

            <div className="space-y-2">
              {participantSlots.map((slotValue, index) => {
                const available = getAvailableParticipants(index);
                const selectedParticipant = participants.find(p => p.id === slotValue);
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500">
                        {t('admin.participant')} {index + 1}
                      </Label>
                      {participantSlots.length > (isMultiParticipant ? 2 : 1) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-slate-400 hover:text-red-500"
                          onClick={() => handleRemoveParticipant(index)}
                        >
                          {t('common.delete')}
                        </Button>
                      )}
                    </div>
                    <Select
                      value={slotValue || ""}
                      onValueChange={(val) => handleSlotChange(index, val || null)}
                    >
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder={t('transfers.selectPlayer')}>
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

            {isMultiParticipant && participantSlots.length < maxParticipants && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParticipant}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('admin.addParticipant')}
              </Button>
            )}

            {hasDuplicates && (
              <p className="text-xs text-red-500">
                {t('admin.duplicateParticipants')}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">{t('events.notes')}</Label>
            <Input
              placeholder={t('events.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">{t('admin.preview')}</Label>
            <div className="bg-blue-50 rounded-lg p-4 min-h-[56px]">
              {previewText ? (
                <p className="text-slate-900 text-sm">{previewText}</p>
              ) : (
                <p className="text-slate-400 text-sm">{t('admin.selectRuleAndParticipants')}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleDiscard}
              className="border-primary text-primary hover:bg-primary/5"
              disabled={isSubmitting}
            >
              {t('forms.discard')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={isSubmitting || !isValid || hasDuplicates}
            >
              {isSubmitting ? t('forms.creating') : t('events.addEvent')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
