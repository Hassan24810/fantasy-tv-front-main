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
import { toast } from "@/hooks/use-toast";
import type { EpisodeEvent } from "@/components/admin/EpisodeDetailDrawer";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteEpisodeEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EpisodeEvent | null;
  onConfirmDelete?: () => Promise<void>;
}

export function DeleteEpisodeEventDialog({ open, onOpenChange, event, onConfirmDelete }: DeleteEpisodeEventDialogProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (onConfirmDelete) {
      setIsDeleting(true);
      try {
        await onConfirmDelete();
        toast({
          title: t("dialogs.deleteEvent.success"),
          description: t("dialogs.deleteEvent.successDescription"),
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        toast({
          title: t("common.error"),
          description: t("dialogs.deleteEvent.errorDescription"),
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    } else {
      console.log("Deleting event:", event?.id);
      toast({
        title: t("dialogs.deleteEvent.success"),
        description: t("dialogs.deleteEvent.successDescription"),
      });
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl text-card-foreground">
            {t("dialogs.deleteEvent.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {t("dialogs.deleteEvent.description")}
            <span className="block mt-2 font-medium text-card-foreground">
              "{event?.eventText}"
            </span>
            <span className="block mt-2 text-sm">
              {t("dialogs.cannotBeUndone")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3 mt-4">
          <AlertDialogCancel 
            className="flex-1 border-border text-card-foreground hover:bg-secondary"
            disabled={isDeleting}
          >
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common.deleting")}
              </>
            ) : (
              t("dialogs.deleteEvent.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
