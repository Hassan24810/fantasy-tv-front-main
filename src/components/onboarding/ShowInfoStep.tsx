import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import i18n, { persistLanguage } from "@/i18n";
import type { ShowData } from "@/pages/Onboarding";
import { useAuth } from "@/contexts/AuthContext";

interface ShowInfoStepProps {
  data: ShowData;
  onChange: (data: ShowData) => void;
}

export default function ShowInfoStep({ data, onChange }: ShowInfoStepProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [uploading, setUploading] = useState<{ logo: boolean; cover: boolean; secondary: boolean }>({
    logo: false,
    cover: false,
    secondary: false,
  });
  const [uploadErrors, setUploadErrors] = useState<{ logo?: string; cover?: string; secondary?: string }>({});

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof ShowData, value: string | number | boolean) => {
    onChange({ ...data, [field]: value });
  };

  const handleLanguageChange = (value: string) => {
    handleChange("language", value);
    i18n.changeLanguage(value);
    persistLanguage(value);
  };

  const handleFileUpload = async (
    file: File,
    type: "logo" | "cover" | "secondary"
  ) => {
    if (!file) return;

    // Clear previous error for this field
    setUploadErrors((prev) => ({ ...prev, [type]: undefined }));

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadErrors((prev) => ({ ...prev, [type]: t('onboarding.invalidFileTypeDesc') }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors((prev) => ({ ...prev, [type]: t('onboarding.fileTooLargeDesc') }));
      return;
    }

    setUploading((prev) => ({ ...prev, [type]: true }));

    try {
      // Upload requires an authenticated Supabase session for RLS-protected buckets.
      if (!session) {
        throw new Error("Your session has expired. Please sign in again and retry.");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("show-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("show-assets")
        .getPublicUrl(filePath);

      const fieldMap = {
        logo: "logoUrl",
        cover: "coverImageUrl",
        secondary: "secondaryImageUrl",
      } as const;

      handleChange(fieldMap[type], urlData.publicUrl);
    } catch (error: any) {
      setUploadErrors((prev) => ({ ...prev, [type]: error.message || t('onboarding.uploadFailedDesc') }));
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleRemoveImage = (type: "logo" | "cover" | "secondary") => {
    const fieldMap = {
      logo: "logoUrl",
      cover: "coverImageUrl",
      secondary: "secondaryImageUrl",
    } as const;
    handleChange(fieldMap[type], "");
  };

  const renderUploadButton = (
    type: "logo" | "cover" | "secondary",
    label: string,
    currentUrl: string,
    inputRef: React.RefObject<HTMLInputElement>,
    tooltipText: string
  ) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-white font-medium">
        {label}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, type);
        }}
      />
      {currentUrl ? (
        <div className="relative group">
          <div className="w-full h-24 rounded-lg border border-white/20 overflow-hidden bg-[#1A2332]">
            <img
              src={currentUrl}
              alt={label}
              className="w-full h-full object-contain"
            />
          </div>
          <button
            onClick={() => handleRemoveImage(type)}
            className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-primary text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {t('onboarding.replace')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading[type]}
          className="w-full h-12 flex items-center justify-between px-4 bg-[#1A2332] border border-white/20 rounded-lg hover:border-white/40 transition-colors disabled:opacity-50"
        >
          <span className="text-gray-400 text-sm">
            {uploading[type] ? t('onboarding.uploading') : t('onboarding.chooseFile')}
          </span>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            {uploading[type] ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-white" />
            )}
          </div>
        </button>
      )}
      {uploadErrors[type] && (
        <p className="text-xs text-red-400">{uploadErrors[type]}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Show Name and Season */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="showName" className="flex items-center gap-2 text-white font-medium">
            {t('onboarding.nameOfShow')}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                  {t('onboarding.nameOfShowTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="showName"
            placeholder={t('onboarding.typeHere')}
            value={data.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="onboarding-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="season" className="flex items-center gap-2 text-white font-medium">
            {t('onboarding.seasonHash')}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                  {t('onboarding.seasonTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="season"
            type="number"
            placeholder={t('onboarding.typeHere')}
            value={data.seasonNumber}
            onChange={(e) => handleChange("seasonNumber", parseInt(e.target.value) || 1)}
            className="onboarding-input"
          />
        </div>
      </div>

      {/* Company Info Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">{t('onboarding.companyInfoBranding')}</h3>
        
        {/* Upload Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderUploadButton("logo", t('onboarding.uploadLogo'), data.logoUrl, logoInputRef, t('onboarding.uploadLogoTooltip'))}
          {renderUploadButton("cover", t('onboarding.uploadCoverImage'), data.coverImageUrl, coverInputRef, t('onboarding.uploadCoverTooltip'))}
        </div>

        {/* Secondary Image Upload */}
        {renderUploadButton("secondary", t('onboarding.uploadBackgroundImage'), data.secondaryImageUrl || "", secondaryInputRef, t('onboarding.uploadBackgroundTooltip'))}
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white font-medium">{t('onboarding.addPrimaryColor')}</Label>
          <div className="flex gap-2">
            <Input
              placeholder="eg. #3B82F6"
              value={data.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="onboarding-input flex-1"
            />
            <input
              type="color"
              value={data.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="w-12 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white font-medium">{t('onboarding.addSecondaryColor')}</Label>
          <div className="flex gap-2">
            <Input
              placeholder="eg. #1E3A8A"
              value={data.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="onboarding-input flex-1"
            />
            <input
              type="color"
              value={data.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="w-12 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-white font-medium">
          {t('onboarding.selectLanguage')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-white/40 hover:text-white/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#1A2332] text-white border-white/20 max-w-[200px]">
                {t('onboarding.selectLanguageTooltip')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Select
          value={data.language}
          onValueChange={handleLanguageChange}
        >
          <SelectTrigger className="onboarding-input">
            <SelectValue placeholder={t('onboarding.selectLanguagePlaceholder')} />
          </SelectTrigger>
          <SelectContent className="bg-[#1A2332] border-white/20">
            <SelectItem value="en" className="text-white hover:bg-white/10">🇬🇧 English</SelectItem>
            <SelectItem value="no" className="text-white hover:bg-white/10">🇳🇴 Norsk</SelectItem>
            <SelectItem value="da" className="text-white hover:bg-white/10">🇩🇰 Dansk</SelectItem>
            <SelectItem value="sv" className="text-white hover:bg-white/10">🇸🇪 Svenska</SelectItem>
            <SelectItem value="fr" className="text-white hover:bg-white/10">🇫🇷 Français</SelectItem>
            <SelectItem value="es" className="text-white hover:bg-white/10">🇪🇸 Español</SelectItem>
            <SelectItem value="de" className="text-white hover:bg-white/10">🇩🇪 Deutsch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white font-medium">{t('onboarding.emailAddress')}</Label>
          <Input
            type="email"
            placeholder={t('onboarding.typeHere')}
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="onboarding-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white font-medium">{t('onboarding.phoneNumber')}</Label>
          <Input
            type="tel"
            placeholder={t('onboarding.typeHere')}
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="onboarding-input"
          />
        </div>
      </div>

      {/* Social Media Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="socialMedia"
          checked={data.useSocialMedia}
          onCheckedChange={(checked) => handleChange("useSocialMedia", checked as boolean)}
          className="border-white/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label htmlFor="socialMedia" className="text-sm text-white/60">
          {t('onboarding.useSocialMedia')}
        </Label>
      </div>

      {/* Social Media Fields */}
      {data.useSocialMedia && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-white font-medium">Facebook</Label>
            <Input
              placeholder={t('onboarding.socialUsernamePlaceholder')}
              value={data.facebook}
              onChange={(e) => handleChange("facebook", e.target.value)}
              className="onboarding-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white font-medium">Instagram</Label>
            <Input
              placeholder={t('onboarding.socialUsernamePlaceholder')}
              value={data.instagram}
              onChange={(e) => handleChange("instagram", e.target.value)}
              className="onboarding-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white font-medium">Twitter X</Label>
            <Input
              placeholder={t('onboarding.socialUsernamePlaceholder')}
              value={data.twitter}
              onChange={(e) => handleChange("twitter", e.target.value)}
              className="onboarding-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white font-medium">TikTok</Label>
            <Input
              placeholder={t('onboarding.socialUsernamePlaceholder')}
              value={data.tiktok}
              onChange={(e) => handleChange("tiktok", e.target.value)}
              className="onboarding-input"
            />
          </div>
        </div>
      )}
    </div>
  );
}
