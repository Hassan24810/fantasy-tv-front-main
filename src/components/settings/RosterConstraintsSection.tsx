import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { GameSettings } from "@/pages/Settings";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SetParticipantPricesModal } from "./SetParticipantPricesModal";

interface RosterConstraintsSectionProps {
  settings: GameSettings;
  showId: string;
  onSave: (updates: Partial<GameSettings>) => Promise<void>;
}

export function RosterConstraintsSection({ settings, showId, onSave }: RosterConstraintsSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    max_players_per_category: settings.max_players_per_category,
    budget_mode_enabled: settings.budget_mode_enabled,
    budget_amount: settings.budget_amount,
    lock_roster_after_episode: settings.lock_roster_after_episode,
    wildcard_enabled: settings.wildcard_enabled,
    free_hit_enabled: settings.free_hit_enabled,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // If budget mode is being enabled, check participant prices first
    if (formData.budget_mode_enabled) {
      const { data: participants, error } = await supabase
        .from("participants")
        .select("id, price")
        .eq("show_id", showId)
        .is("price", null);

      if (!error && participants && participants.length > 0) {
        // Save settings first, then open price modal
        await onSave(formData);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setShowPriceModal(true);
        return;
      }
    }

    await onSave(formData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  return (
    <Card className="bg-card text-card-foreground border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{t('settings.rosterSection.title')}</CardTitle>
        <CardDescription className="text-card-foreground/60">
          {t('settings.rosterSection.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max Players Per Category */}
        <div className="space-y-2">
          <Label htmlFor="max_players_per_category" className="text-card-foreground">
            {t('settings.rosterSection.maxPlayersPerCategory')}
          </Label>
          <p className="text-sm text-card-foreground/60">
            {t('settings.rosterSection.maxPlayersDescription')}
          </p>
          <Input
            id="max_players_per_category"
            type="number"
            min={1}
            max={10}
            value={formData.max_players_per_category ?? ""}
            onChange={(e) =>
              handleChange(
                "max_players_per_category",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            placeholder={t('settings.teamRulesSection.noLimit')}
            className="max-w-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Budget Mode */}
        <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-card-foreground">{t('settings.rosterSection.budgetMode')}</Label>
              <p className="text-sm text-card-foreground/60">
                {t('settings.rosterSection.budgetModeDescription')}
              </p>
            </div>
            <Switch
              checked={formData.budget_mode_enabled}
              onCheckedChange={(v) => handleChange("budget_mode_enabled", v)}
            />
          </div>

          {formData.budget_mode_enabled && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="budget_amount" className="text-card-foreground">
                {t('settings.rosterSection.budgetAmount')}
              </Label>
              <Input
                id="budget_amount"
                type="number"
                min={0}
                value={formData.budget_amount ?? ""}
                onChange={(e) =>
                  handleChange(
                    "budget_amount",
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                placeholder={t('settings.rosterSection.budgetPlaceholder')}
                className="max-w-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-xs text-card-foreground/50">
                {t('settings.rosterSection.budgetDescription')}
              </p>
            </div>
          )}
        </div>

        {/* Toggle Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-card-foreground">{t('settings.rosterSection.lockRoster')}</Label>
              <p className="text-sm text-card-foreground/60">
                {t('settings.rosterSection.lockRosterDescription')}
              </p>
            </div>
            <Switch
              checked={formData.lock_roster_after_episode}
              onCheckedChange={(v) => handleChange("lock_roster_after_episode", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-card-foreground">{t('settings.rosterSection.wildcard')}</Label>
              <p className="text-sm text-card-foreground/60">
                {t('settings.rosterSection.wildcardDescription')}
              </p>
            </div>
            <Switch
              checked={formData.wildcard_enabled}
              onCheckedChange={(v) => handleChange("wildcard_enabled", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-card-foreground">{t('settings.rosterSection.freeHit')}</Label>
              <p className="text-sm text-card-foreground/60">
                {t('settings.rosterSection.freeHitDescription')}
              </p>
            </div>
            <Switch
              checked={formData.free_hit_enabled}
              onCheckedChange={(v) => handleChange("free_hit_enabled", v)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? t('common.loading') : saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t('settings.saved')}
              </>
            ) : (
              t('common.saveChanges')
            )}
          </Button>
          {saved && (
            <span className="text-sm text-green-400">{t('toast.savedChanges')}</span>
          )}
        </div>
      </CardContent>

      <SetParticipantPricesModal
        showId={showId}
        open={showPriceModal}
        onOpenChange={setShowPriceModal}
        onSaved={() => {}}
      />
    </Card>
  );
}