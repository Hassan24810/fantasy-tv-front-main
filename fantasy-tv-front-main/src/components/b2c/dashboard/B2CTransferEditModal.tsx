import { useState, useEffect } from "react";
import { X, ArrowRight, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import type { Transfer } from "@/hooks/useUserTransfers";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface B2CTransferEditModalProps {
  open: boolean;
  onClose: () => void;
  transfer: Transfer | null;
  showId: string;
  currentTeam: { participantId: string; name: string; photoUrl?: string }[];
  onConfirmEdit: (transferId: string, newOutId: string, newInId: string) => Promise<{ success: boolean; error?: string }>;
}

export const B2CTransferEditModal = ({
  open,
  onClose,
  transfer,
  showId,
  currentTeam,
  onConfirmEdit,
}: B2CTransferEditModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<"selectOut" | "selectIn">("selectOut");
  const [selectedOut, setSelectedOut] = useState<Participant | null>(null);
  const [selectedIn, setSelectedIn] = useState<Participant | null>(null);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open && transfer) {
      setSelectedOut(transfer.participantOut);
      setSelectedIn(transfer.participantIn);
      setStep("selectOut");
      setSearchQuery("");
    }
  }, [open, transfer]);

  // Fetch available participants when selecting IN
  useEffect(() => {
    if (step === "selectIn" && showId) {
      const fetchAvailable = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase.rpc("get_released_participants", {
            p_show_id: showId,
          });

          if (error) throw error;

          // Filter out participants already on team (except the one we're replacing)
          const teamIds = currentTeam.map((t) => t.participantId);
          const filtered = (data || []).filter(
            (p: Participant) =>
              !teamIds.includes(p.id) || p.id === transfer?.participantIn.id
          );

          setAvailableParticipants(filtered);
        } catch (err) {
          console.error("Error fetching participants:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAvailable();
    }
  }, [step, showId, currentTeam, transfer]);

  const handleSelectOut = (participant: { participantId: string; name: string; photoUrl?: string }) => {
    // Create a minimal Participant object for the selection
    setSelectedOut({
      id: participant.participantId,
      name: participant.name,
      photo_url: participant.photoUrl || null,
    } as Participant);
    setStep("selectIn");
    setSearchQuery("");
  };

  const handleSelectIn = (participant: Participant) => {
    setSelectedIn(participant);
  };

  const handleConfirm = async () => {
    if (!transfer || !selectedOut || !selectedIn) return;

    setIsSubmitting(true);
    const result = await onConfirmEdit(transfer.id, selectedOut.id, selectedIn.id);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    }
  };

  const filteredTeam = currentTeam.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailable = availableParticipants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open || !transfer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('transfers.editTransfer')}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {step === "selectOut" ? t('transfers.selectWhoOut') : t('transfers.selectWhoIn')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Selection Preview */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between bg-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${selectedOut ? "border-red-300 bg-red-100" : "border-slate-300 bg-slate-200"}`}>
                {selectedOut?.photo_url ? (
                  <img src={selectedOut.photo_url} alt={selectedOut.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-500">
                    {selectedOut?.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{selectedOut?.name || t('transfers.selectPlayer')}</p>
                <p className="text-xs text-red-600">{t('transfers.out')}</p>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-slate-400" />

            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${selectedIn ? "border-green-300 bg-green-100" : "border-slate-300 bg-slate-200"}`}>
                {selectedIn?.photo_url ? (
                  <img src={selectedIn.photo_url} alt={selectedIn.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-500">
                    {selectedIn?.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{selectedIn?.name || t('transfers.selectPlayer')}</p>
                <p className="text-xs text-green-600">{t('transfers.in')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={t('transfers.searchParticipants')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[40vh] overflow-y-auto">
          {step === "selectOut" ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">{t('transfers.yourCurrentTeam')}</p>
              {filteredTeam.map((participant) => (
                <button
                  key={participant.participantId}
                  onClick={() => handleSelectOut(participant)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedOut?.id === participant.participantId
                      ? "bg-blue-100 border-2 border-blue-400"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    {participant.photoUrl ? (
                      <img src={participant.photoUrl} alt={participant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-500">
                        {participant.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900">{participant.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{t('transfers.availableParticipants')}</p>
                <button
                  onClick={() => setStep("selectOut")}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ← {t('common.back')}
                </button>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                filteredAvailable.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => handleSelectIn(participant)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedIn?.id === participant.id
                        ? "bg-green-100 border-2 border-green-400"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      {participant.photo_url ? (
                        <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-500">
                          {participant.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900">{participant.name}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOut || !selectedIn || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('transfers.saving')}
              </>
            ) : (
              t('transfers.confirmChanges')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
