import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle } from "lucide-react";
import { GameSettings } from "@/pages/Settings";

interface TeamRulesSectionProps {
  settings: GameSettings;
  onSave: (updates: Partial<GameSettings>) => Promise<void>;
}

export function TeamRulesSection({ settings, onSave }: TeamRulesSectionProps) {
  const [formData, setFormData] = useState({
    team_size: settings.team_size,
    min_boys: settings.min_boys,
    min_girls: settings.min_girls,
    max_boys: settings.max_boys,
    max_girls: settings.max_girls,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalGenderRequirements = formData.min_boys + formData.min_girls;
  const hasValidationError = totalGenderRequirements > formData.team_size;

  const handleSave = async () => {
    if (hasValidationError) return;
    
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (field: string, value: number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  return (
    <Card className="bg-card text-card-foreground border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Team Rules</CardTitle>
        <CardDescription className="text-card-foreground/60">
          Configure the size and composition requirements for fantasy teams.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Size */}
        <div className="space-y-2">
          <Label htmlFor="team_size" className="text-card-foreground">
            Team Size
          </Label>
          <p className="text-sm text-card-foreground/60">
            Number of players each team must have
          </p>
          <Input
            id="team_size"
            type="number"
            min={1}
            max={20}
            value={formData.team_size}
            onChange={(e) => handleChange("team_size", parseInt(e.target.value) || 1)}
            className="max-w-xs bg-white border-slate-200 text-slate-900"
          />
        </div>

        {/* Gender Requirements */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-card-foreground mb-1">Gender Requirements</h3>
            <p className="text-sm text-card-foreground/60">
              Set minimum or maximum gender constraints for teams
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_boys" className="text-card-foreground">
                Minimum Boys
              </Label>
              <Input
                id="min_boys"
                type="number"
                min={0}
                max={formData.team_size}
                value={formData.min_boys}
                onChange={(e) => handleChange("min_boys", parseInt(e.target.value) || 0)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_girls" className="text-card-foreground">
                Minimum Girls
              </Label>
              <Input
                id="min_girls"
                type="number"
                min={0}
                max={formData.team_size}
                value={formData.min_girls}
                onChange={(e) => handleChange("min_girls", parseInt(e.target.value) || 0)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_boys" className="text-card-foreground">
                Maximum Boys (optional)
              </Label>
              <Input
                id="max_boys"
                type="number"
                min={0}
                max={formData.team_size}
                value={formData.max_boys ?? ""}
                onChange={(e) =>
                  handleChange("max_boys", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="No limit"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_girls" className="text-card-foreground">
                Maximum Girls (optional)
              </Label>
              <Input
                id="max_girls"
                type="number"
                min={0}
                max={formData.team_size}
                value={formData.max_girls ?? ""}
                onChange={(e) =>
                  handleChange("max_girls", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="No limit"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {hasValidationError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>
                Gender requirements ({totalGenderRequirements}) cannot exceed team size (
                {formData.team_size})
              </span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving || hasValidationError}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? "Saving..." : saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          {saved && (
            <span className="text-sm text-green-400">Changes saved successfully</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
