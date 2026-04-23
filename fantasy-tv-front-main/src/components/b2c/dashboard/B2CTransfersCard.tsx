import { CheckCircle2, ArrowRightLeft, Calendar, Trash2, ChevronRight, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransferHistory {
  id: string;
  playerIn: {
    name: string;
    photo?: string;
  };
  playerOut: {
    name: string;
    photo?: string;
  };
  date: string;
}

interface B2CTransfersCardProps {
  transfersAvailable: number;
  maxTransfers: number;
  totalTransferred: number;
  nextResetTime?: string;
  transferHistory: TransferHistory[];
  onViewHistory: () => void;
  onDeleteTransfer?: (transferId: string) => Promise<{ success: boolean; error?: string }>;
  onEditTransfer?: (transferId: string) => void;
}

export const B2CTransfersCard = ({
  transfersAvailable,
  maxTransfers,
  totalTransferred,
  nextResetTime,
  transferHistory,
  onViewHistory,
  onDeleteTransfer,
  onEditTransfer,
}: B2CTransfersCardProps) => {
  const { t } = useTranslation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<TransferHistory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (transfer: TransferHistory, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransferToDelete(transfer);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transferToDelete || !onDeleteTransfer) return;

    setIsDeleting(true);
    await onDeleteTransfer(transferToDelete.id);
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
    setTransferToDelete(null);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">

        {/* Next Reset Time */}
        {nextResetTime && (

          <div className="flex items-end justify-between text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
            <div className="flex items-center text-foreground font-medium">
              <h3 className="text-lg font-semibold text-foreground mb-4">{t('transfers.yourTransfers')}</h3>
            </div>
            <div className="flex  flex-col items-center gap-1 text-foreground font-medium">
              <span className="flex items-center gap-1 text-foreground font-medium">
                <RefreshCw className="w-3 h-3" />

                {nextResetTime}
              </span>
              <span>{t('transfers.nextReset')}</span>
            </div>
          </div>
        )}
        {/* Stats Row */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="grid grid-cols-2">
            {/* Left Col: Transfers Available */}
            <div className="p-4 relative group cursor-default">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-100 transition-transform group-hover:scale-105">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-black text-[#0f172a]">
                  {transfersAvailable}/{maxTransfers}
                </p>
              </div>
              <p className="text-xs font-medium text-slate-500">{t('transfers.transferAvailable')}</p>
              
              {/* Vertical Divider */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-slate-100" />
            </div>

            {/* Right Col: Total Transferred */}
            <div className="p-4 group cursor-default">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-100 transition-transform group-hover:scale-105">
                  <ArrowRightLeft className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-black text-[#0f172a]">
                  {totalTransferred}
                </p>
              </div>
              <p className="text-xs font-medium text-slate-500">{t('transfers.totalTransferred')}</p>
            </div>
          </div>
        </div>



        {/* Current Transfers */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground mb-3">{t('transfers.currentTransfers')}</h4>
          {transferHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('transfers.noTransfers')}</p>
          ) : (
            transferHistory.slice(0, 3).map((transfer) => (
              <div 
                key={transfer.id}
                className="flex items-center gap-4 border border-gray-200 hover:bg-gray-100 rounded-lg p-4 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-red-100 overflow-hidden flex-shrink-0 border border-red-200">
                    {transfer.playerOut.photo ? (
                      <img 
                        src={transfer.playerOut.photo} 
                        alt={transfer.playerOut.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-red-600 font-medium">
                        {transfer.playerOut.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium" title={transfer.playerOut.name}>
                      {transfer.playerOut.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground ">
                      {transfer.date}
                    </p>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0 mx-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                </div>

                {/* Player In */}
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-green-100 overflow-hidden flex-shrink-0 border border-green-200">
                    {transfer.playerIn.photo ? (
                      <img 
                        src={transfer.playerIn.photo} 
                        alt={transfer.playerIn.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-green-600 font-medium">
                        {transfer.playerIn.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium " title={transfer.playerIn.name}>
                      {transfer.playerIn.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground ">
                      {transfer.date}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0 ml-auto">
                  {onDeleteTransfer && (
                    <button
                      onClick={(e) => handleDeleteClick(transfer, e)}
                      className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center text-white transition-opacity hover:opacity-90"
                      title="Delete transfer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {onEditTransfer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTransfer(transfer.id);
                      }}
                      className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white transition-opacity hover:opacity-90"
                      title="Edit transfer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* View History Button */}
        <Button
          variant="outline"
          onClick={onViewHistory}
          className="w-full mt-4 bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 transition-all duration-300 shadow-md"
        >
          {t('transfers.history')}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transfers.deleteTransfer')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('transfers.deleteConfirmation', {
                playerOut: transferToDelete?.playerOut.name,
                playerIn: transferToDelete?.playerIn.name
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t('transfers.deleting') : t('transfers.deleteTransfer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
