import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { League } from "@/hooks/useLeagues";

// For backward compatibility with old format
interface LegacyLeague {
  id: string;
  name: string;
  usersInLeague: number;
  totalPoints: number;
  status: "Public" | "Private";
  code: string;
  creator: string;
  users: string[];
}

interface DeleteLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: League | LegacyLeague | null;
  onDelete?: (id: string) => Promise<boolean | undefined>;
}

export function DeleteLeagueDialog({ open, onOpenChange, league, onDelete }: DeleteLeagueDialogProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!league || !onDelete) return;
    
    setIsDeleting(true);
    await onDelete(league.id);
    setIsDeleting(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!league) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-center text-lg font-medium">
            {t("dialogs.deleteLeague.title", { name: league.name })}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("dialogs.cannotBeUndone")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:justify-center mt-4">
          <Button
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-8"
            disabled={isDeleting}
          >
            {isDeleting ? t("common.deleting") : t("dialogs.yesDelete")}
          </Button>
          <Button
            onClick={handleCancel}
            className="bg-slate-700 hover:bg-slate-600 text-white px-8"
            disabled={isDeleting}
          >
            {t("dialogs.noCancel")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
