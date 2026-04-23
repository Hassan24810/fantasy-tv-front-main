import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Check, AlertTriangle } from "lucide-react";
import { GameSettings } from "@/pages/Settings";
import { useTranslation } from "react-i18next";

interface ScoringSectionProps {
  settings: GameSettings;
  onSave: (updates: Partial<GameSettings>) => Promise<void>;
}

export function ScoringSection({ settings, onSave }: ScoringSectionProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    scoring_profile: settings.scoring_profile,
    bonus_points_enabled: settings.bonus_points_enabled,
    tiebreak_rule: settings.tiebreak_rule,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
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
        <CardTitle className="text-xl font-semibold">{t('settings.scoringSection.title')}</CardTitle>
        <CardDescription className="text-card-foreground/60">
          {t('settings.scoringSection.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Impact Warning */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-400">{t('settings.scoringSection.impactWarning')}</p>
            <p className="text-sm text-card-foreground/70">
              {t('settings.scoringSection.impactWarningDescription')}
            </p>
          </div>
        </div>

        {/* Scoring Profile */}
        <div className="space-y-2">
          <Label className="text-card-foreground">{t('settings.scoringSection.scoringProfile')}</Label>
          <p className="text-sm text-card-foreground/60">
            {t('settings.scoringSection.scoringProfileDescription')}
          </p>
          <Select
            value={formData.scoring_profile}
            onValueChange={(v) => handleChange("scoring_profile", v)}
          >
            <SelectTrigger className="max-w-md bg-white border-slate-200 text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="standard">{t('settings.scoringSection.standard')}</SelectItem>
              <SelectItem value="competitive">{t('settings.scoringSection.competitive')}</SelectItem>
              <SelectItem value="casual">{t('settings.scoringSection.casual')}</SelectItem>
              <SelectItem value="custom">{t('settings.scoringSection.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bonus Points */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
          <div>
            <Label className="text-card-foreground">{t('settings.scoringSection.bonusPoints')}</Label>
            <p className="text-sm text-card-foreground/60">
              {t('settings.scoringSection.bonusPointsDescription')}
            </p>
          </div>
          <Switch
            checked={formData.bonus_points_enabled}
            onCheckedChange={(v) => handleChange("bonus_points_enabled", v)}
          />
        </div>

        {/* Tiebreak Rules */}
        <div className="space-y-2">
          <Label className="text-card-foreground">{t('settings.scoringSection.tiebreakRule')}</Label>
          <p className="text-sm text-card-foreground/60">
            {t('settings.scoringSection.tiebreakDescription')}
          </p>
          <Select
            value={formData.tiebreak_rule}
            onValueChange={(v) => handleChange("tiebreak_rule", v)}
          >
            <SelectTrigger className="max-w-md bg-white border-slate-200 text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="total_points">{t('settings.scoringSection.totalPoints')}</SelectItem>
              <SelectItem value="head_to_head">{t('settings.scoringSection.headToHead')}</SelectItem>
              <SelectItem value="recent_form">{t('settings.scoringSection.recentForm')}</SelectItem>
              <SelectItem value="earliest_join">{t('settings.scoringSection.earliestJoin')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scoring Rules Summary */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <h4 className="font-medium text-card-foreground mb-3">{t('settings.scoringSection.currentSummary')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-card-foreground/60">{t('settings.scoringSection.profile')}:</span>
              <p className="font-medium text-card-foreground capitalize">
                {formData.scoring_profile}
              </p>
            </div>
            <div>
              <span className="text-card-foreground/60">{t('settings.scoringSection.bonusPoints')}:</span>
              <p className="font-medium text-card-foreground">
                {formData.bonus_points_enabled ? t('settings.scoringSection.enabled') : t('settings.scoringSection.disabled')}
              </p>
            </div>
            <div>
              <span className="text-card-foreground/60">{t('settings.scoringSection.tiebreaker')}:</span>
              <p className="font-medium text-card-foreground">
                {formData.tiebreak_rule.replace(/_/g, " ")}
              </p>
            </div>
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
    </Card>
  );
}