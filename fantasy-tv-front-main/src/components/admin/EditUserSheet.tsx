import { useState, useEffect } from "react";
import { HelpCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdminShowUser } from "@/hooks/useAdminShowUsers";
import { useTranslation } from "react-i18next";

interface EditUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminShowUser | null;
  onSubmit: (data: { id: string; username?: string; email?: string; gender?: string }) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export function EditUserSheet({ open, onOpenChange, user, onSubmit, onSendPasswordReset, isLoading }: EditUserSheetProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    gender: "",
  });
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        gender: user.gender || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await onSubmit({
      id: user.id,
      username: formData.username,
      email: formData.email,
      gender: formData.gender || undefined,
    });
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    await onSendPasswordReset(user.email);
    setIsSendingReset(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] bg-white border-l border-slate-200 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-xl font-semibold text-slate-900">{t('admin.editUser')}</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="px-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-username" className="text-sm font-medium text-slate-700">{t('admin.username')}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] bg-slate-800 text-white text-xs">
                  {t('admin.usernameTooltip')}
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="edit-username"
              placeholder={t('forms.typeHere')}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-email" className="text-sm font-medium text-slate-700">{t('admin.emailAddress')}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] bg-slate-800 text-white text-xs">
                  {t('admin.emailTooltip')}
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="edit-email"
              type="email"
              placeholder={t('forms.typeHere')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-gender" className="text-sm font-medium text-slate-700">{t('admin.genderOptional')}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] bg-slate-800 text-white text-xs">
                  {t('admin.genderTooltip')}
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-11">
                <SelectValue placeholder={t('admin.selectGender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">{t('admin.male')}</SelectItem>
                <SelectItem value="Female">{t('admin.female')}</SelectItem>
                <SelectItem value="Other">{t('admin.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password Reset Section */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium text-slate-700">{t('admin.password')}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] bg-slate-800 text-white text-xs">
                  {t('admin.passwordSecurityNote')}
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="password"
              value="••••••••"
              disabled
              className="bg-slate-50 border-slate-200 text-slate-400 h-11"
            />
            <p className="text-xs text-slate-500">
              {t('admin.passwordNote')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendPasswordReset}
              disabled={isSendingReset}
              className="mt-2 text-primary border-primary/30 hover:bg-primary/10"
            >
              {isSendingReset ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {t('admin.sendPasswordResetLink')}
            </Button>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white"
              disabled={isLoading || !formData.username || !formData.email}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.update')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}