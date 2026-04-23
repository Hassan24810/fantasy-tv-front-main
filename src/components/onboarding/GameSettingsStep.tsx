import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import type { GameSettings } from "@/pages/Onboarding";

interface GameSettingsStepProps {
  data: GameSettings;
  onChange: (data: GameSettings) => void;
}

export default function GameSettingsStep({ data, onChange }: GameSettingsStepProps) {
  const { t } = useTranslation();
  
  const handleChange = (field: keyof GameSettings, value: string | number | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white font-medium">
              {t('onboarding.gameSettings.playersPerTeam')}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                    How many contestants can users pick for their team
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="number"
              placeholder={t('common.typeHere')}
              value={data.playersPerTeam}
              onChange={(e) => handleChange("playersPerTeam", parseInt(e.target.value) || 0)}
              className="onboarding-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white font-medium">
              {t('settings.minBoys')}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                    Minimum number of male contestants required on each team
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="number"
              placeholder={t('common.typeHere')}
              value={data.minBoys}
              onChange={(e) => handleChange("minBoys", parseInt(e.target.value) || 0)}
              className="onboarding-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white font-medium">
              {t('onboarding.gameSettings.transfersPerReset')}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                    How many team changes users can make per reset period
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="number"
              placeholder={t('onboarding.gameSettings.transfersExample')}
              value={data.transfersPerReset}
              onChange={(e) => handleChange("transfersPerReset", parseInt(e.target.value) || 0)}
              className="onboarding-input"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white font-medium">
              {t('settings.minGirls')}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                    Minimum number of female contestants required on each team
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="number"
              placeholder={t('common.typeHere')}
              value={data.minGirls}
              onChange={(e) => handleChange("minGirls", parseInt(e.target.value) || 0)}
              className="onboarding-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white font-medium">
              {t('onboarding.gameSettings.transferFrequency')}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                    How often users' transfer allowance resets
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select
              value={data.transferResetFrequency}
              onValueChange={(v) => handleChange("transferResetFrequency", v)}
            >
              <SelectTrigger className="onboarding-input">
                <SelectValue placeholder={t('onboarding.gameSettings.selectFrequency')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1A2332] border-white/20">
                <SelectItem value="daily" className="text-white hover:bg-white/10">{t('settings.transfersSection.daily')}</SelectItem>
                <SelectItem value="weekly" className="text-white hover:bg-white/10">{t('settings.transfersSection.weekly')}</SelectItem>
                <SelectItem value="per_episode" className="text-white hover:bg-white/10">{t('settings.transfersSection.perEpisode')}</SelectItem>
                <SelectItem value="custom" className="text-white hover:bg-white/10">{t('settings.transfersSection.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Budget Mode */}
      <div className="space-y-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-3">
          <Checkbox
            id="budget-enabled"
            checked={data.budgetEnabled}
            onCheckedChange={(checked) => handleChange("budgetEnabled", !!checked)}
            className="border-white/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label htmlFor="budget-enabled" className="text-white font-medium cursor-pointer">
            {t('onboarding.gameSettings.enableBudget', 'Enable team budget')}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                Each participant gets a price and users must stay within budget when picking teams
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {data.budgetEnabled && (
          <div className="space-y-2 pl-7">
            <Label className="text-white font-medium">
              {t('onboarding.gameSettings.totalBudget', 'Total team budget')}
            </Label>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={data.budgetAmount || ""}
              onChange={(e) => handleChange("budgetAmount", parseInt(e.target.value) || 0)}
              className="onboarding-input max-w-[200px]"
              min={1}
            />
          </div>
        )}
      </div>
    </div>
  );
}
