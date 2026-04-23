import React, { useState, forwardRef } from "react";
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
import type { Episode } from "@/hooks/useEpisodes";
import { AlertTriangle } from "lucide-react";

interface DeleteEpisodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: Episode | null;
  onDelete?: (id: string) => Promise<boolean | undefined>;
}

export const DeleteEpisodeDialog = forwardRef<HTMLDivElement, DeleteEpisodeDialogProps>(
  function DeleteEpisodeDialog({ open, onOpenChange, episode, onDelete }, ref) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!episode || !onDelete) return;
    
    setIsDeleting(true);
    await onDelete(episode.id);
    setIsDeleting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl text-card-foreground">
            {t("dialogs.deleteEpisode.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {t("dialogs.deleteEpisode.description", {
              episodeNumber: episode?.episodeNumber,
              episodeName: episode?.episodeName,
              eventsCount: episode?.eventsCount || 0
            })}
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
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? t("common.deleting") : t("dialogs.deleteEpisode.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
