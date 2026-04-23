import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Participant } from "@/pages/Participants";
import { useTranslation } from "react-i18next";

interface SetParticipantStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
  onStatusChanged?: () => void;
}

export function SetParticipantStatusDialog({ 
  open, 
  onOpenChange, 
  participant,
  onStatusChanged,
}: SetParticipantStatusDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const newStatus = participant?.status === "active" ? "inactive" : "active";
  const actionText = newStatus === "inactive" ? t('admin.setInactive') : t('admin.setActive');
  const descriptionText = newStatus === "inactive" 
    ? t('admin.inactiveDescription')
    : t('admin.activeDescription');

  const handleConfirm = async () => {
    if (!participant) return;

    setIsLoading(true);
    const { error } = await supabase
      .from("participants")
      .update({ 
        status: newStatus,
        // Clear elimination fields if reactivating
        ...(newStatus === "active" && {
          eliminated_episode: null,
          eliminated_by_event_id: null,
        }),
      })
      .eq("id", participant.id);

    setIsLoading(false);

    if (error) {
      console.error("[SetParticipantStatusDialog] Failed to update status:", error);
      toast({
        title: t('toast.error'),
        description: t('admin.statusUpdateFailed'),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: newStatus === "inactive" ? t('admin.participantDeactivated') : t('admin.participantActivated'),
      description: t('admin.isNowStatus', { name: participant.name, status: newStatus }),
    });

    onStatusChanged?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-slate-200 max-w-md">
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-xl font-semibold text-slate-900 text-center">
            {actionText} - {participant?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 text-center">
            {descriptionText}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:justify-center mt-6">
          <AlertDialogCancel 
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 px-8"
            disabled={isLoading}
          >
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={newStatus === "inactive" 
              ? "bg-amber-600 text-white hover:bg-amber-700 px-8" 
              : "bg-green-600 text-white hover:bg-green-700 px-8"
            }
          >
            {isLoading ? t('common.updating') : actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}