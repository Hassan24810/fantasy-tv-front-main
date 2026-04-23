import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminShowUser } from "@/hooks/useAdminShowUsers";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminShowUser | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteUserDialog({ open, onOpenChange, user, onConfirm, isLoading }: DeleteUserDialogProps) {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl p-8">
        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="text-lg font-semibold text-slate-900 text-center">
            {t("dialogs.deleteUser.title", { username: user?.username })}
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500">
            {t("dialogs.deleteUser.description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-6">
          <Button
            variant="destructive"
            className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("dialogs.yesDelete")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 border-primary text-primary hover:bg-primary/5 rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("dialogs.noCancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
