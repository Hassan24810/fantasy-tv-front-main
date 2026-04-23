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
import { useUpdates } from "@/hooks/useUpdates";
import type { Tables } from "@/integrations/supabase/types";

type ShowUpdate = Tables<"show_updates">;

interface DeleteUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  update: ShowUpdate | null;
}

export function DeleteUpdateDialog({ open, onOpenChange, update }: DeleteUpdateDialogProps) {
  const { t } = useTranslation();
  const { deleteUpdate } = useUpdates();

  const handleDelete = async () => {
    if (!update) return;
    await deleteUpdate.mutateAsync(update.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-slate-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900">{t("dialogs.deleteUpdate.title")}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            {t("dialogs.deleteUpdate.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-200 text-slate-700 hover:bg-slate-50">
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
