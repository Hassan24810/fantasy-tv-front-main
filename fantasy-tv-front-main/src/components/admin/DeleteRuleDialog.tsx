import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Rule } from "@/hooks/useRules";

interface DeleteRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
  onDelete: (id: string, title?: string) => Promise<boolean>;
}

export function DeleteRuleDialog({ open, onOpenChange, rule, onDelete }: DeleteRuleDialogProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!rule) return;
    
    setIsDeleting(true);
    const success = await onDelete(rule.id, rule.title);
    setIsDeleting(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl p-8">
        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="text-lg font-semibold text-slate-900 text-center">
            {t("dialogs.deleteRule.title", { title: rule?.title })}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 text-center">
            {t("dialogs.deleteRule.description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-6">
          <Button
            variant="destructive"
            className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? t("common.deleting") : t("dialogs.yesDelete")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 border-primary text-primary hover:bg-primary/5 rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t("dialogs.noCancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
