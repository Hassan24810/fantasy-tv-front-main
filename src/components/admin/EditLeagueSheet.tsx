import { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { League } from "@/hooks/useLeagues";
import { useTranslation } from "react-i18next";

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

interface EditLeagueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: League | LegacyLeague | null;
  onUpdate?: (id: string, data: Partial<League>) => Promise<boolean | undefined>;
}

export function EditLeagueSheet({ open, onOpenChange, league, onUpdate }: EditLeagueSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (league) {
      setName(league.name);
      // Handle both new and legacy format
      if ('description' in league) {
        setDescription(league.description || "");
        setIsPublic(league.isPublic);
        setMaxMembers(league.maxMembers?.toString() || "100");
      } else {
        setDescription("");
        setIsPublic(league.status === "Public");
        setMaxMembers("100");
      }
    }
  }, [league]);

  const handleSubmit = async () => {
    if (!name.trim() || !league) return;
    
    if (onUpdate) {
      setIsSubmitting(true);
      await onUpdate(league.id, {
        name: name.trim(),
        description: description.trim() || null,
        isPublic,
        maxMembers: parseInt(maxMembers) || 100,
      });
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    onOpenChange(false);
  };

  if (!league) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] bg-white border-slate-200 overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold text-slate-900">{t('admin.editLeague')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* League Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium text-slate-700">{t('leagues.leagueName')}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('leagues.leagueNameTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              placeholder={t('leagues.enterLeagueName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium text-slate-700">{t('leagues.descriptionOptional')}</Label>
            </div>
            <Input
              placeholder={t('leagues.describeLeague')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Max Members */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium text-slate-700">{t('leagues.maxMembers')}</Label>
            </div>
            <Input
              type="number"
              min="1"
              placeholder="100"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <Label className="text-slate-900 font-medium">{t('leagues.isPublic')}</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPublic ? t('leagues.isPublicDesc') : t('leagues.isPrivateDesc')}
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleDiscard}
              className="border-primary text-primary hover:bg-primary/5"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? t('common.loading') : t('common.saveChanges')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}