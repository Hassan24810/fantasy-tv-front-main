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
import type { Participant } from "@/pages/Participants";

interface DeleteParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
}

export function DeleteParticipantDialog({ open, onOpenChange, participant }: DeleteParticipantDialogProps) {
  const { t } = useTranslation();
  
  const handleDelete = () => {
    console.log("Deleting participant:", participant);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-slate-200 max-w-md">
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-xl font-semibold text-slate-900 text-center">
            {t("dialogs.deleteParticipant.title", { name: participant?.name })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 text-center sr-only">
            {t("dialogs.cannotBeUndone")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:justify-center mt-6">
          <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700 border-0 px-8">
            {t("dialogs.noCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90 px-8"
          >
            {t("dialogs.yesDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
