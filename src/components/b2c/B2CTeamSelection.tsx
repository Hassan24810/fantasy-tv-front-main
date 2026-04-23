import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Info, ChevronDown, X, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSelectableParticipants } from "@/lib/participantSelectability";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;
type Episode = Tables<"episodes">;
type Event = Tables<"events">;
type GameSettings = Tables<"game_settings">;

interface B2CTeamSelectionProps {
  participants: Participant[];
  episodes: Episode[];
  events: Event[];
  selectedTeam: Participant[];
  onTeamChange: (team: Participant[]) => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onSkipTeam?: () => void;
  isLoading?: boolean;
  gameSettings?: GameSettings | null;
}

export const B2CTeamSelection = ({
  participants,
  episodes,
  events,
  selectedTeam,
  onTeamChange,
  onBack,
  onCancel,
  onSubmit,
  onSkipTeam,
  isLoading = false,
  gameSettings,
}: B2CTeamSelectionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Hide scroll hint after user scrolls
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    
    const handleScroll = () => {
      if (viewport.scrollTop > 50) {
        setShowScrollHint(false);
      }
    };
    
    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter to only selectable participants
  const selectableParticipants = useMemo(() => {
    return getSelectableParticipants(participants, { episodes, events });
  }, [participants, episodes, events]);

  const visibleCount = 4;
  const maxIndex = Math.max(0, selectableParticipants.length - visibleCount);

  const handlePrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));

  const toggleParticipant = (participant: Participant) => {
    const isSelected = selectedTeam.some((p) => p.id === participant.id);
    if (isSelected) {
      onTeamChange(selectedTeam.filter((p) => p.id !== participant.id));
    } else {
      if (!canSelectParticipant(participant)) return;
      onTeamChange([...selectedTeam, participant]);
    }
  };

  const removeFromTeam = (participantId: string) => {
    onTeamChange(selectedTeam.filter((p) => p.id !== participantId));
  };

  const toggleInfo = (participantId: string) => {
    setExpandedParticipant(expandedParticipant === participantId ? null : participantId);
  };

  const maleCount = useMemo(() => 
    selectedTeam.filter(p => p.gender?.toLowerCase() === 'male').length, 
    [selectedTeam]
  );
  const femaleCount = useMemo(() => 
    selectedTeam.filter(p => p.gender?.toLowerCase() === 'female').length, 
    [selectedTeam]
  );

  const budgetEnabled = gameSettings?.budget_mode_enabled ?? false;
  const budgetAmount = gameSettings?.budget_amount ?? 0;
  const teamBudgetUsed = useMemo(() => 
    selectedTeam.reduce((sum, p) => sum + (p.price ?? 0), 0),
    [selectedTeam]
  );
  const budgetRemaining = budgetAmount - teamBudgetUsed;

  // Validation logic
  const validation = useMemo(() => {
    const teamSize = gameSettings?.team_size ?? 0;
    const minBoys = gameSettings?.min_boys ?? 0;
    const maxBoys = gameSettings?.max_boys ?? Infinity;
    const minGirls = gameSettings?.min_girls ?? 0;
    const maxGirls = gameSettings?.max_girls ?? Infinity;

    const checks: Record<string, { label: string; valid: boolean; required: boolean }> = {
      teamSize: {
        label: `Lagstørrelse: ${selectedTeam.length}/${teamSize}`,
        valid: selectedTeam.length === teamSize,
        required: teamSize > 0,
      },
      minBoys: {
        label: `Minimum gutter: ${maleCount}/${minBoys}`,
        valid: maleCount >= minBoys,
        required: minBoys > 0,
      },
      maxBoys: {
        label: `Maksimum gutter: ${maleCount}/${maxBoys}`,
        valid: maxBoys === null || maxBoys === Infinity || maleCount <= maxBoys,
        required: maxBoys !== null && maxBoys !== Infinity && maxBoys > 0,
      },
      minGirls: {
        label: `Minimum jenter: ${femaleCount}/${minGirls}`,
        valid: femaleCount >= minGirls,
        required: minGirls > 0,
      },
      maxGirls: {
        label: `Maksimum jenter: ${femaleCount}/${maxGirls}`,
        valid: maxGirls === null || maxGirls === Infinity || femaleCount <= maxGirls,
        required: maxGirls !== null && maxGirls !== Infinity && maxGirls > 0,
      },
    };

    if (budgetEnabled && budgetAmount > 0) {
      checks.budget = {
        label: `Budsjett: ${teamBudgetUsed}/${budgetAmount}`,
        valid: teamBudgetUsed <= budgetAmount,
        required: true,
      };
    }

    const allValid = Object.values(checks).every(c => !c.required || c.valid);

    return { checks, allValid };
  }, [selectedTeam.length, maleCount, femaleCount, gameSettings, budgetEnabled, budgetAmount, teamBudgetUsed]);

  // Check if a participant can be selected (budget constraint)
  const canSelectParticipant = (participant: Participant) => {
    if (!budgetEnabled || !budgetAmount) return true;
    if (selectedTeam.some(p => p.id === participant.id)) return true; // already selected, allow deselect
    return (participant.price ?? 0) <= budgetRemaining;
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(90vh-2rem)]">
      <h2 
        className="text-2xl font-bold text-center py-6 px-6 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Select Participants
      </h2>

      <ScrollArea className="flex-1 px-6">
        <div className="relative mb-8">
        {selectableParticipants.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No participants available for selection</p>
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-white bg-black/20 hover:bg-black/40 disabled:opacity-30"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div className="overflow-hidden mx-10">
              <div 
                className="flex gap-4 transition-transform duration-300"
                style={{ transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` }}
              >
                {selectableParticipants.map((participant) => {
                  const isSelected = selectedTeam.some((p) => p.id === participant.id);
                  const isExpanded = expandedParticipant === participant.id;
                  const canSelect = canSelectParticipant(participant);

                  return (
                    <div
                      key={participant.id}
                      className={cn(
                        "flex-shrink-0 relative rounded-xl overflow-hidden transition-all duration-300",
                        "border-2",
                        isSelected ? "border-blue-500 shadow-lg shadow-blue-500/30" : "border-white/20",
                        canSelect ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                      )}
                      style={{ width: `calc(${100 / visibleCount}% - 12px)` }}
                      onClick={() => toggleParticipant(participant)}
                    >
                      {/* Price badge */}
                      {budgetEnabled && participant.price != null && (
                        <div className="absolute top-2 left-2 z-20 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {participant.price}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleInfo(participant.id); }}
                        className="absolute top-2 right-2 z-20 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                      >
                        <Info className="h-4 w-4 text-white" />
                      </button>

                      <div className="aspect-[3/4] bg-gradient-to-b from-gray-700 to-gray-900">
                        {participant.photo_url ? (
                          <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-2xl text-gray-400">{participant.name.charAt(0)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pt-8">
                        <h3 className="font-semibold text-white text-sm">{participant.name}</h3>
                        <p className="text-xs text-gray-300">{participant.occupation || "Contestant"}</p>
                      </div>

                      {isExpanded && (
                        <div className="absolute inset-0 bg-[#0f1829]/95 p-4 flex flex-col justify-center text-sm text-gray-300 z-10 overflow-y-auto">
                          <p>{participant.bio || "No bio available."}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-white bg-black/20 hover:bg-black/40 disabled:opacity-30"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: Math.ceil(selectableParticipants.length / visibleCount) }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    Math.floor(currentIndex / visibleCount) === idx ? "bg-blue-500" : "bg-white/30"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Team</h3>
        {selectedTeam.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">Please Select Participants</p>
            <p>For Your Team</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-48">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {selectedTeam.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2 group">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      {participant.photo_url ? (
                        <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">{participant.name.charAt(0)}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{participant.name}</p>
                      <p className="text-gray-400 text-xs truncate">{participant.occupation || "Contestant"}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleInfo(participant.id); }} className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-gray-400 hover:text-white">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2 text-center">Male: {maleCount}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTeam.slice(0, 4).map((participant) => (
                      <div key={`male-${participant.id}`} className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-red-500">
                        {participant.photo_url ? (
                          <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                            <span className="text-gray-400 text-lg">{participant.name.charAt(0)}</span>
                          </div>
                        )}
                        <button onClick={() => removeFromTeam(participant.id)} className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
                          <X className="h-3 w-3 text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">{participant.name}</p>
                          <p className="text-gray-300 text-[10px] truncate">{participant.occupation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2 text-center">Female: {femaleCount}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTeam.slice(4, 8).map((participant) => (
                      <div key={`female-${participant.id}`} className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-blue-500">
                        {participant.photo_url ? (
                          <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                            <span className="text-gray-400 text-lg">{participant.name.charAt(0)}</span>
                          </div>
                        )}
                        <button onClick={() => removeFromTeam(participant.id)} className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
                          <X className="h-3 w-3 text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">{participant.name}</p>
                          <p className="text-gray-300 text-[10px] truncate">{participant.occupation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Validation Status */}
      {gameSettings && (
        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
          <h4 className="text-sm font-medium text-white mb-3">Lagkrav</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(validation.checks).map(([key, check]) => {
              if (!check.required) return null;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
                    check.valid 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  {check.valid ? (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{check.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
        
      {/* Scroll indicator - shows when content overflows */}
      {showScrollHint && selectableParticipants.length > 4 && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none pb-4">
          <div className="h-20 bg-gradient-to-t from-[#0f1829] via-[#0f1829]/80 to-transparent" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white/60 text-sm">
            <ChevronDown className="w-5 h-5 animate-bounce" />
            <span>Scroll for more</span>
          </div>
        </div>
      )}
    </ScrollArea>

      <div className="flex flex-col gap-3 p-6 pt-4 border-t border-white/10 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <Button onClick={onBack} className="px-8" style={{ background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))" }}>Back</Button>
            <Button onClick={onCancel} className="px-8" style={{ background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))" }}>Cancel</Button>
          </div>
          <Button onClick={onSubmit} disabled={!validation.allValid || isLoading} className="px-8 text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))" }}>
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>) : "Submit Team"}
          </Button>
        </div>
        {onSkipTeam && (
          <Button 
            variant="ghost" 
            onClick={onSkipTeam} 
            disabled={isLoading}
            className="w-full text-gray-400 hover:text-white hover:bg-white/5"
          >
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>) : "Gå videre uten å velge lag →"}
          </Button>
        )}
      </div>
    </div>
  );
};
