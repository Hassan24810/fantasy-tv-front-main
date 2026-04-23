import { useState, useMemo } from "react";
import { X, ArrowRightLeft, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { Transfer } from "@/hooks/useUserTransfers";

interface B2CTransferHistoryModalProps {
  open: boolean;
  onClose: () => void;
  allTransfers: Transfer[];
  currentResetPeriod: string;
}

export const B2CTransferHistoryModal = ({
  open,
  onClose,
  allTransfers,
  currentResetPeriod,
}: B2CTransferHistoryModalProps) => {
  const { t } = useTranslation();

  // Split transfers into current round and previous rounds
  const { currentRoundTransfers, previousRoundTransfers, groupedPreviousTransfers } = useMemo(() => {
    const current = allTransfers.filter((t) => t.resetPeriod === currentResetPeriod);
    const previous = allTransfers.filter((t) => t.resetPeriod !== currentResetPeriod);

    // Group previous transfers by reset period
    const grouped: Record<string, Transfer[]> = {};
    previous.forEach((t) => {
      if (!grouped[t.resetPeriod]) {
        grouped[t.resetPeriod] = [];
      }
      grouped[t.resetPeriod].push(t);
    });

    return {
      currentRoundTransfers: current,
      previousRoundTransfers: previous,
      groupedPreviousTransfers: grouped,
    };
  }, [allTransfers, currentResetPeriod]);


  const formatTransferDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, h:mm a");
    } catch {
      return dateStr;
    }
  };

  const formatResetPeriod = (period: string) => {
    if (period.startsWith("EP-BATCH-")) {
      const batch = period.replace("EP-BATCH-", "");
      return `Episodes ${(parseInt(batch) - 1) * 2 + 1}-${parseInt(batch) * 2}`;
    }
    if (period.startsWith("EP-")) {
      return `Episode ${period.replace("EP-", "")}`;
    }
    return period;
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">{t('transfers.history')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="w-full justify-start px-6 pt-4 bg-transparent">
              <TabsTrigger value="current" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                {t('transfers.currentRound')}
              </TabsTrigger>
              <TabsTrigger value="previous" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                {t('transfers.previousRounds')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="p-6 max-h-[60vh] overflow-y-auto">
              {currentRoundTransfers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{t('transfers.noTransfersThisRound')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentRoundTransfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="flex items-center gap-3 bg-slate-50 rounded-xl p-4"
                    >
                      {/* Player Out (leaving) */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-red-100 overflow-hidden flex-shrink-0 border-2 border-red-200">
                          {transfer.participantOut.photo_url ? (
                            <img
                              src={transfer.participantOut.photo_url}
                              alt={transfer.participantOut.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-red-600 font-medium">
                              {transfer.participantOut.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900 font-medium truncate">
                            {transfer.participantOut.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Transferred {format(new Date(transfer.transferDate), "EEEE, dd.MM")}
                          </p>
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                      </div>

                      {/* Player In (joining) */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-green-100 overflow-hidden flex-shrink-0 border-2 border-green-200">
                          {transfer.participantIn.photo_url ? (
                            <img
                              src={transfer.participantIn.photo_url}
                              alt={transfer.participantIn.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-green-600 font-medium">
                              {transfer.participantIn.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900 font-medium truncate">
                            {transfer.participantIn.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Transferred {format(new Date(transfer.transferDate), "EEEE, dd.MM")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="previous" className="p-6 max-h-[60vh] overflow-y-auto">
              {Object.keys(groupedPreviousTransfers).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{t('transfers.noPreviousTransfers')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPreviousTransfers).map(([period, transfers]) => (
                    <div key={period}>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-200 rounded text-xs">
                          {formatResetPeriod(period)}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {transfers.map((transfer) => (
                          <div
                            key={transfer.id}
                            className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 opacity-80"
                          >
                            {/* Player Out */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                {transfer.participantOut.photo_url ? (
                                  <img
                                    src={transfer.participantOut.photo_url}
                                    alt={transfer.participantOut.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                                    {transfer.participantOut.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-slate-700 truncate font-medium">
                                  {transfer.participantOut.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {format(new Date(transfer.transferDate), "EEEE, dd.MM")}
                                </p>
                              </div>
                            </div>

                            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <ArrowRightLeft className="w-3 h-3 text-blue-500" />
                            </div>

                            {/* Player In */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                {transfer.participantIn.photo_url ? (
                                  <img
                                    src={transfer.participantIn.photo_url}
                                    alt={transfer.participantIn.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                                    {transfer.participantIn.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-slate-700 truncate font-medium">
                                  {transfer.participantIn.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {format(new Date(transfer.transferDate), "EEEE, dd.MM")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
