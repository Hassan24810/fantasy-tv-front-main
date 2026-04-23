import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Plus, Trash2, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GameSettings } from "@/pages/Settings";
import { useTranslation } from "react-i18next";

interface TransfersSectionProps {
  settings: GameSettings;
  onSave: (updates: Partial<GameSettings>) => Promise<void>;
}

export function TransfersSection({ settings, onSave }: TransfersSectionProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    transfer_reset_frequency: settings.transfer_reset_frequency,
    transfers_per_reset: settings.transfers_per_reset,
    transfer_window_mode: settings.transfer_window_mode,
    transfer_windows: settings.transfer_windows || [],
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

  const addWindow = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    handleChange("transfer_windows", [
      ...formData.transfer_windows,
      {
        start: now.toISOString().slice(0, 16),
        end: tomorrow.toISOString().slice(0, 16),
      },
    ]);
  };

  const removeWindow = (index: number) => {
    handleChange(
      "transfer_windows",
      formData.transfer_windows.filter((_, i) => i !== index)
    );
  };

  const updateWindow = (index: number, field: "start" | "end", value: string) => {
    const updated = [...formData.transfer_windows];
    updated[index] = { ...updated[index], [field]: value };
    handleChange("transfer_windows", updated);
  };

  // Determine current transfer status
  const isTransfersOpen = () => {
    if (formData.transfer_window_mode === "always_open") return true;
    if (formData.transfer_window_mode === "locked_during_live") return true; // Depends on episode
    if (formData.transfer_window_mode === "time_window") {
      const now = new Date();
      return formData.transfer_windows.some((w) => {
        const start = new Date(w.start);
        const end = new Date(w.end);
        return now >= start && now <= end;
      });
    }
    return false;
  };

  const getNextChange = () => {
    if (formData.transfer_window_mode !== "time_window") return null;
    const now = new Date();
    const upcoming = formData.transfer_windows
      .flatMap((w) => [
        { date: new Date(w.start), type: "open" },
        { date: new Date(w.end), type: "close" },
      ])
      .filter((e) => e.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0] || null;
  };

  const open = isTransfersOpen();
  const nextChange = getNextChange();

  return (
    <Card className="bg-card text-card-foreground border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{t('settings.transfersSection.title')}</CardTitle>
        <CardDescription className="text-card-foreground/60">
          {t('settings.transfersSection.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Preview */}
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-3 mb-2">
            {open ? (
              <Unlock className="h-5 w-5 text-green-400" />
            ) : (
              <Lock className="h-5 w-5 text-amber-400" />
            )}
            <span className="font-medium text-card-foreground">
              {t('settings.transfersSection.currentlyOpen')}{" "}
              <Badge
                variant={open ? "default" : "secondary"}
                className={open ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}
              >
                {open ? t('settings.transfersSection.open') : t('settings.transfersSection.closed')}
              </Badge>
            </span>
          </div>
          {nextChange && (
            <p className="text-sm text-card-foreground/60 ml-8">
              {nextChange.type === "open" ? t('settings.transfersSection.nextOpen') : t('settings.transfersSection.nextClose')}:{" "}
              {nextChange.date.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        {/* Transfer Reset Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-card-foreground">{t('settings.transfersSection.resetFrequency')}</Label>
            <p className="text-sm text-card-foreground/60">
              {t('settings.transfersSection.resetDescription')}
            </p>
            <Select
              value={formData.transfer_reset_frequency}
              onValueChange={(v) => handleChange("transfer_reset_frequency", v)}
            >
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="daily">{t('settings.transfersSection.daily')}</SelectItem>
                <SelectItem value="weekly">{t('settings.transfersSection.weekly')}</SelectItem>
                <SelectItem value="per_episode">{t('settings.transfersSection.perEpisode')}</SelectItem>
                <SelectItem value="custom">{t('settings.transfersSection.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfers_per_reset" className="text-card-foreground">
              {t('settings.transfersSection.transfersPerReset')}
            </Label>
            <p className="text-sm text-card-foreground/60">
              {t('settings.transfersSection.transfersPerResetDescription')}
            </p>
            <Input
              id="transfers_per_reset"
              type="number"
              min={0}
              max={20}
              value={formData.transfers_per_reset}
              onChange={(e) =>
                handleChange("transfers_per_reset", parseInt(e.target.value) || 0)
              }
              className="bg-white border-slate-200 text-slate-900"
            />
          </div>
        </div>

        {/* Transfer Window Mode */}
        <div className="space-y-2">
          <Label className="text-card-foreground">{t('settings.transfersSection.windowMode')}</Label>
          <p className="text-sm text-card-foreground/60">
            {t('settings.transfersSection.windowModeDescription')}
          </p>
          <Select
            value={formData.transfer_window_mode}
            onValueChange={(v) => handleChange("transfer_window_mode", v)}
          >
            <SelectTrigger className="max-w-md bg-white border-slate-200 text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="always_open">{t('settings.transfersSection.alwaysOpen')}</SelectItem>
              <SelectItem value="time_window">{t('settings.transfersSection.timeWindow')}</SelectItem>
              <SelectItem value="locked_during_live">{t('settings.transfersSection.lockedDuringLive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time Windows (if applicable) */}
        {formData.transfer_window_mode === "time_window" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-card-foreground">{t('settings.transfersSection.transferWindows')}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addWindow}
                className="border-border text-card-foreground hover:bg-secondary"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('settings.transfersSection.addWindow')}
              </Button>
            </div>

            {formData.transfer_windows.length === 0 ? (
              <p className="text-sm text-card-foreground/60 italic">
                {t('settings.transfersSection.noWindows')}
              </p>
            ) : (
              <div className="space-y-3">
                {formData.transfer_windows.map((window, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-card-foreground/60">{t('settings.transfersSection.start')}</Label>
                        <Input
                          type="datetime-local"
                          value={window.start}
                          onChange={(e) => updateWindow(index, "start", e.target.value)}
                          className="bg-white border-slate-200 text-slate-900 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-card-foreground/60">{t('settings.transfersSection.end')}</Label>
                        <Input
                          type="datetime-local"
                          value={window.end}
                          onChange={(e) => updateWindow(index, "end", e.target.value)}
                          className="bg-white border-slate-200 text-slate-900 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWindow(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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