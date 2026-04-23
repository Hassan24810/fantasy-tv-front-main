import { useState, useEffect, useMemo } from "react";
import { X, Search, ArrowRightLeft, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShow } from "@/contexts/ShowContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getSelectableParticipants } from "@/lib/participantSelectability";
import { useTranslation } from "react-i18next";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface ParticipantWithPoints extends Participant {
  totalPoints: number;
  gameweekPoints: number;
}

interface B2CTransferModalProps {
  open: boolean;
  onClose: () => void;
  currentParticipant: Participant | null;
  onConfirmTransfer: (newParticipant: Participant) => void;
  teamParticipantIds: string[];
  canTransfer?: boolean;
  transferBlockReason?: string;
  nextAllowedTime?: string | null;
}

export const B2CTransferModal = ({
  open,
  onClose,
  currentParticipant,
  onConfirmTransfer,
  teamParticipantIds,
  canTransfer = true,
  transferBlockReason = "",
  nextAllowedTime,
}: B2CTransferModalProps) => {
  const { participants, show, episodes, events, settings } = useShow();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [participantPoints, setParticipantPoints] = useState<Map<string, { total: number; gw: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Mobile step: 1 = show current/new participant cards, 2 = participant picker
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  const budgetEnabled = settings?.budget_mode_enabled ?? false;
  const budgetAmount = settings?.budget_amount ?? 0;

  // Reset mobile step when modal opens
  useEffect(() => {
    if (open) setMobileStep(1);
  }, [open]);

  // Fetch points for all available participants
  useEffect(() => {
    const fetchPoints = async () => {
      if (!show?.id || !open) return;

      const pointsMap = new Map<string, { total: number; gw: number }>();

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

          pointsMap.set(p.id, { total: totalPoints || 0, gw: gwPoints });
        })
      );

      setParticipantPoints(pointsMap);
    };

    fetchPoints();
  }, [participants, show?.id, open]);

  const selectableParticipants = useMemo(() => {
    return getSelectableParticipants(participants, { episodes, events });
  }, [participants, episodes, events]);

  const currentTeamBudget = useMemo(() => {
    if (!budgetEnabled || !budgetAmount) return 0;
    return participants
      .filter(p => teamParticipantIds.includes(p.id) && p.id !== currentParticipant?.id)
      .reduce((sum, p) => sum + (p.price ?? 0), 0);
  }, [budgetEnabled, budgetAmount, participants, teamParticipantIds, currentParticipant]);

  const canSelectForBudget = (participant: Participant) => {
    if (!budgetEnabled || !budgetAmount) return true;
    return currentTeamBudget + (participant.price ?? 0) <= budgetAmount;
  };

  if (!open) return null;

  const availableParticipants = selectableParticipants.filter(
    (p) => !teamParticipantIds.includes(p.id)
  );

  const filteredParticipants = availableParticipants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedParticipant && canTransfer) {
      setShowConfirm(true);
    }
  };

  const executeTransfer = () => {
    if (selectedParticipant && canTransfer) {
      onConfirmTransfer(selectedParticipant);
      setSelectedParticipant(null);
      setShowConfirm(false);
      setSearch("");
      setMobileStep(1);
    }
  };

  const handleClose = () => {
    setSelectedParticipant(null);
    setSearch("");
    setMobileStep(1);
    onClose();
  };

  const getParticipantPoints = (participantId: string) => {
    return participantPoints.get(participantId) || { total: 0, gw: 0 };
  };

  const currentPoints = currentParticipant
    ? getParticipantPoints(currentParticipant.id)
    : { total: 0, gw: 0 };

  const selectedPoints = selectedParticipant
    ? getParticipantPoints(selectedParticipant.id)
    : { total: 0, gw: 0 };

  // Reusable participant card
  const ParticipantCard = ({
    participant,
    points,
    placeholder,
  }: {
    participant: Participant | null;
    points: { total: number; gw: number };
    placeholder?: boolean;
  }) => (
    <div
      className={`relative flex-1 max-w-[160px] md:max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden transition-all
        ${placeholder
          ? "border-2 border-dashed border-slate-300 bg-slate-50"
          : participant
            ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20"
            : "border-2 border-slate-200 shadow-sm"
        }`}
    >
      {participant ? (
        <>
          {participant.photo_url ? (
            <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold text-blue-600">{participant.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2">
            <p className="text-white font-semibold text-[10px] sm:text-xs truncate">{participant.name}</p>
            <p className="text-[8px] sm:text-[10px] text-white/80">{participant.age} {t('common.years')}</p>
          </div>
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex gap-0.5 sm:gap-1">
            <span className="bg-red-500 text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded text-white font-medium">{points.total}</span>
            <span className="bg-green-500 text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded text-white font-medium">{points.gw}</span>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 sm:p-3 text-center">
          <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 mb-1 sm:mb-1.5 opacity-20" />
          <p className="text-[9px] sm:text-[10px] font-medium leading-tight">{t('transfers.selectPlayer')}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-6xl mx-2 sm:mx-4 shadow-2xl overflow-hidden flex flex-col h-[90vh] md:max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{t('transfers.yourTeam')}</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              {t('transfers.transferDescription')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Transfer Blocked Warning */}
        {!canTransfer && (
          <div className="mx-3 sm:mx-4 mt-2 sm:mt-3 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 sm:gap-3 flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-amber-800">{transferBlockReason}</p>
              {nextAllowedTime && (
                <p className="text-[9px] sm:text-[10px] text-amber-700 mt-0.5">
                  Next transfer: {format(new Date(nextAllowedTime), "EEEE, MMM d 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── DESKTOP LAYOUT (md+): two-panel side by side ─── */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* Left Panel — side by side cards, scrollable */}
          <div className="w-[420px] lg:w-[480px] p-4 border-r border-slate-200 flex-shrink-0 overflow-y-auto flex items-center justify-center">
            <div className="flex items-center justify-center gap-3 w-full">

              {/* Current participant */}
              <div className="relative flex-1 max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
                {currentParticipant?.photo_url ? (
                  <img src={currentParticipant.photo_url} alt={currentParticipant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">{currentParticipant?.name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-semibold text-xs truncate">{currentParticipant?.name}</p>
                  <p className="text-[10px] text-white/80">{currentParticipant?.age} {t('common.years')}</p>
                </div>
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <span className="bg-red-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{currentPoints.total}</span>
                  <span className="bg-green-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{currentPoints.gw}</span>
                </div>
              </div>

              {/* Swap icon */}
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 z-10 -mx-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              </div>

              {/* Selected / placeholder */}
              <div className={`relative flex-1 max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden transition-all ${
                selectedParticipant
                  ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                  : "border-2 border-dashed border-slate-300 bg-slate-50"
              }`}>
                {selectedParticipant ? (
                  <>
                    {selectedParticipant.photo_url ? (
                      <img src={selectedParticipant.photo_url} alt={selectedParticipant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600">{selectedParticipant.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white font-semibold text-xs truncate">{selectedParticipant.name}</p>
                      <p className="text-[10px] text-white/80">{selectedParticipant.age} {t('common.years')}</p>
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <span className="bg-red-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{selectedPoints.total}</span>
                      <span className="bg-green-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{selectedPoints.gw}</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-3">
                    <ArrowRightLeft className="w-5 h-5 opacity-20" />
                    <p className="text-[10px] font-medium text-center leading-tight">Select a player</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('transfers.searchParticipants')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 h-9 text-sm"
              />
            </div>
            <div className="relative flex-1 min-h-0">
              <div className="overflow-y-auto h-full pr-2">
                <div className="grid grid-cols-3 gap-3">
                  {filteredParticipants.map((participant) => {
                    const points = getParticipantPoints(participant.id);
                    const canAfford = canSelectForBudget(participant);
                    return (
                      <div
                        key={participant.id}
                        onClick={() => canAfford && setSelectedParticipant(participant)}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all border-2 ${!canAfford
                          ? 'cursor-not-allowed opacity-50 border-transparent'
                          : selectedParticipant?.id === participant.id
                            ? 'border-blue-500 ring-2 ring-blue-500/20 cursor-pointer'
                            : 'border-transparent hover:border-slate-300 cursor-pointer'
                          }`}
                      >
                        {budgetEnabled && participant.price != null && (
                          <div className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {participant.price}
                          </div>
                        )}
                        {participant.photo_url ? (
                          <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <span className="text-xl font-bold text-blue-600">{participant.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white font-semibold text-xs truncate">{participant.name}</p>
                          <p className="text-[10px] text-white/80">{participant.age} {t('common.years')}</p>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <span className="bg-red-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{points.total}</span>
                          <span className="bg-green-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{points.gw}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredParticipants.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <p>{t('transfers.noParticipantsFound')}</p>
                  </div>
                )}
              </div>
              {filteredParticipants.length > 4 && (
                <div className="absolute bottom-0 left-0 right-2 pointer-events-none">
                  <div className="h-12 bg-gradient-to-t from-white via-white/80 to-transparent" />
                </div>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleConfirm}
                disabled={!selectedParticipant || !canTransfer}
                className="px-6 h-9 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 text-sm"
              >
                {canTransfer ? t('transfers.confirmChange') : t('transfers.transfersBlocked')}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── MOBILE LAYOUT (< md): two steps ─── */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden">

          {/* STEP 1: current card + swap + new card */}
          {mobileStep === 1 && (
            <div className="flex flex-col items-center overflow-y-auto p-4 gap-3 flex-1">

              {/* Current participant card */}
              <div className="relative w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm flex-shrink-0">
                {currentParticipant?.photo_url ? (
                  <img src={currentParticipant.photo_url} alt={currentParticipant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">{currentParticipant?.name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-semibold text-xs truncate">{currentParticipant?.name}</p>
                  <p className="text-[10px] text-white/80">{currentParticipant?.age} {t('common.years')}</p>
                </div>
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <span className="bg-red-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{currentPoints.total}</span>
                  <span className="bg-green-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{currentPoints.gw}</span>
                </div>
              </div>

              {/* Swap icon */}
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shadow-sm flex-shrink-0">
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              </div>

              {/* New participant card or placeholder */}
              <div className={`relative w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden transition-all flex-shrink-0 ${
                selectedParticipant
                  ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                  : "border-2 border-dashed border-slate-300 bg-slate-50"
              }`}>
                {selectedParticipant ? (
                  <>
                    {selectedParticipant.photo_url ? (
                      <img src={selectedParticipant.photo_url} alt={selectedParticipant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600">{selectedParticipant.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white font-semibold text-xs truncate">{selectedParticipant.name}</p>
                      <p className="text-[10px] text-white/80">{selectedParticipant.age} {t('common.years')}</p>
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <span className="bg-red-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{selectedPoints.total}</span>
                      <span className="bg-green-500 text-[8px] px-1 py-0.5 rounded text-white font-medium">{selectedPoints.gw}</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-3">
                    <ArrowRightLeft className="w-5 h-5 opacity-20" />
                    <p className="text-[10px] font-medium text-center leading-tight">Select a player</p>
                  </div>
                )}
              </div>

              {/* Next button */}
              <div className="w-full mt-auto pt-2">
                <Button
                  onClick={() => setMobileStep(2)}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {selectedParticipant ? "Change Selection" : "Select Participant"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: search + grid + action buttons */}
          {mobileStep === 2 && (
            <div className="flex flex-col overflow-hidden flex-1 p-3">
              {/* Search */}
              <div className="relative mb-3 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={t('transfers.searchParticipants')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 h-10 text-sm"
                />
              </div>

              {/* Scrollable grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-2 gap-2.5 pb-2">
                  {filteredParticipants.map((participant) => {
                    const points = getParticipantPoints(participant.id);
                    const canAfford = canSelectForBudget(participant);
                    return (
                      <div
                        key={participant.id}
                        onClick={() => canAfford && setSelectedParticipant(participant)}
                        className={`relative rounded-xl overflow-hidden transition-all border-2 ${
                          !canAfford
                            ? "cursor-not-allowed opacity-50 border-transparent"
                            : selectedParticipant?.id === participant.id
                            ? "border-blue-500 ring-2 ring-blue-500/20 cursor-pointer"
                            : "border-transparent hover:border-slate-300 cursor-pointer"
                        }`}
                        style={{ aspectRatio: "3/4" }}
                      >
                        {budgetEnabled && participant.price != null && (
                          <div className="absolute top-1 left-1 z-10 bg-amber-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">
                            {participant.price}
                          </div>
                        )}
                        {participant.photo_url ? (
                          <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">{participant.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5">
                          <p className="text-white font-semibold text-[10px] truncate">{participant.name}</p>
                          <p className="text-[8px] text-white/80">{participant.age} {t('common.years')}</p>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 flex gap-0.5">
                          <span className="bg-red-500 text-[7px] px-0.5 py-0.5 rounded text-white font-medium">{points.total}</span>
                          <span className="bg-green-500 text-[7px] px-0.5 py-0.5 rounded text-white font-medium">{points.gw}</span>
                        </div>
                        {selectedParticipant?.id === participant.id && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
                            <span className="text-white text-[10px] font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {filteredParticipants.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <p>{t('transfers.noParticipantsFound')}</p>
                  </div>
                )}
              </div>

              {/* Bottom action buttons */}
              <div className="flex flex-col gap-2 mt-3 flex-shrink-0">
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedParticipant || !canTransfer}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 text-sm font-semibold"
                >
                  {canTransfer ? t('transfers.confirmChange') : t('transfers.transfersBlocked')}
                </Button>
                <Button
                  onClick={() => setMobileStep(1)}
                  variant="outline"
                  className="w-full h-11 border-slate-300 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Overlay Modal — shared for both layouts */}
        {showConfirm && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="relative bg-black/40 border border-slate-700 rounded-2xl w-full max-w-md p-6 sm:p-8 text-center shadow-2xl">
              <h3 className="text-white text-lg sm:text-xl font-medium leading-relaxed mb-6 sm:mb-8">
                Are you sure you want to replace<br />
                <span className="font-bold text-white">{currentParticipant?.name}</span> with{" "}
                <span className="font-bold text-white">{selectedParticipant?.name}</span>?
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={executeTransfer}
                  className="flex-1 bg-[#ff5a5f] hover:bg-[#ff444a] text-white font-bold p-2.5 sm:p-3 rounded-xl transition-colors text-sm sm:text-base"
                >
                  Yes, Confirm
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md font-bold p-2.5 sm:p-3 rounded-xl transition-colors text-sm sm:text-base border border-slate-700"
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
