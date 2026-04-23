import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Upload, X } from "lucide-react";
import { BrandingSettings } from "@/pages/Settings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface BrandingSectionProps {
  settings: BrandingSettings;
  onSave: (updates: Partial<BrandingSettings>) => Promise<void>;
}

export function BrandingSection({ settings, onSave }: BrandingSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    logo_url: settings.logo_url,
    background_image_url: settings.background_image_url,
    cover_image_url: settings.cover_image_url,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    contact_email: settings.contact_email || "",
    contact_phone: settings.contact_phone || "",
    facebook_username: settings.facebook_username || "",
    instagram_username: settings.instagram_username || "",
    twitter_username: settings.twitter_username || "",
    tiktok_username: settings.tiktok_username || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...formData,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      facebook_username: formData.facebook_username || null,
      instagram_username: formData.instagram_username || null,
      twitter_username: formData.twitter_username || null,
      tiktok_username: formData.tiktok_username || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const uploadImage = async (file: File, field: string) => {
    if (!file) return;

    setUploading(field);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${settings.show_id}/${field}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("show-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("show-assets")
        .getPublicUrl(fileName);

      handleChange(field, urlData.publicUrl);
      toast({
        title: t('settings.brandingSection.imageUploaded'),
        description: t('settings.brandingSection.imageUploadedDescription'),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t('settings.brandingSection.uploadFailed'),
        description: t('settings.brandingSection.uploadFailedDescription'),
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (field: string) => {
    handleChange(field, null);
  };

  const ImageUploader = ({
    label,
    field,
    inputRef,
    value,
  }: {
    label: string;
    field: string;
    inputRef: React.RefObject<HTMLInputElement>;
    value: string | null;
  }) => (
    <div className="space-y-2">
      <Label className="text-card-foreground">{label}</Label>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file, field);
        }}
      />
      {value ? (
        <div className="relative group w-full max-w-xs">
          <img
            src={value}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading === field}
            >
              {uploading === field ? t('forms.uploading') : t('settings.brandingSection.replace')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeImage(field)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading === field}
          className="w-full max-w-xs h-32 border-dashed border-2 border-border hover:border-primary/50 bg-secondary/30 text-card-foreground"
        >
          <div className="flex flex-col items-center gap-2">
            {uploading === field ? (
              <div className="animate-pulse">{t('forms.uploading')}</div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-card-foreground/50" />
                <span className="text-sm">{t('settings.brandingSection.clickToUpload')}</span>
              </>
            )}
          </div>
        </Button>
      )}
    </div>
  );

  return (
    <Card className="bg-card text-card-foreground border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{t('settings.brandingSection.title')}</CardTitle>
        <CardDescription className="text-card-foreground/60">
          {t('settings.brandingSection.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ImageUploader
            label={t('settings.brandingSection.logo')}
            field="logo_url"
            inputRef={logoInputRef}
            value={formData.logo_url}
          />
          <ImageUploader
            label={t('settings.brandingSection.backgroundImage')}
            field="background_image_url"
            inputRef={backgroundInputRef}
            value={formData.background_image_url}
          />
          <ImageUploader
            label={t('settings.brandingSection.coverImage')}
            field="cover_image_url"
            inputRef={coverInputRef}
            value={formData.cover_image_url}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary_color" className="text-card-foreground">
              {t('settings.brandingSection.primaryColor')}
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primary_color"
                value={formData.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                className="w-12 h-12 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                placeholder="#6366f1"
                className="max-w-32 bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary_color" className="text-card-foreground">
              {t('settings.brandingSection.secondaryColor')}
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="secondary_color"
                value={formData.secondary_color}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
                className="w-12 h-12 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={formData.secondary_color}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
                placeholder="#8b5cf6"
                className="max-w-32 bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <Label className="text-card-foreground font-medium">Contact Info</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-card-foreground/80 text-sm">
                Email
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                placeholder="info@example.com"
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-card-foreground/80 text-sm">
                Phone
              </Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
                placeholder="+45 12345678"
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="space-y-4">
          <Label className="text-card-foreground font-medium">Social Media</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook_username" className="text-card-foreground/80 text-sm">
                Facebook
              </Label>
              <Input
                id="facebook_username"
                value={formData.facebook_username}
                onChange={(e) => handleChange("facebook_username", e.target.value)}
                placeholder="Write the username here..."
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_username" className="text-card-foreground/80 text-sm">
                Instagram
              </Label>
              <Input
                id="instagram_username"
                value={formData.instagram_username}
                onChange={(e) => handleChange("instagram_username", e.target.value)}
                placeholder="Write the username here..."
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter_username" className="text-card-foreground/80 text-sm">
                Twitter X
              </Label>
              <Input
                id="twitter_username"
                value={formData.twitter_username}
                onChange={(e) => handleChange("twitter_username", e.target.value)}
                placeholder="Write the username here..."
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_username" className="text-card-foreground/80 text-sm">
                TikTok
              </Label>
              <Input
                id="tiktok_username"
                value={formData.tiktok_username}
                onChange={(e) => handleChange("tiktok_username", e.target.value)}
                placeholder="Write the username here..."
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label className="text-card-foreground">{t('settings.brandingSection.preview')}</Label>
          <div
            className="relative rounded-lg overflow-hidden h-48 border border-border"
            style={{
              backgroundImage: formData.background_image_url
                ? `url(${formData.background_image_url})`
                : undefined,
              backgroundColor: formData.background_image_url
                ? undefined
                : formData.primary_color,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-3">
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1"
                />
              )}
              <div>
                <p className="text-white font-bold text-lg">{t('settings.brandingSection.yourShowName')}</p>
                <p className="text-white/80 text-sm">{t('settings.brandingSection.fantasyGameExperience')}</p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 border-white"
                style={{ backgroundColor: formData.primary_color }}
                title={t('settings.brandingSection.primaryColor')}
              />
              <div
                className="w-8 h-8 rounded-full border-2 border-white"
                style={{ backgroundColor: formData.secondary_color }}
                title={t('settings.brandingSection.secondaryColor')}
              />
            </div>
          </div>
          <p className="text-xs text-card-foreground/50">
            {t('settings.brandingSection.previewDescription')}
          </p>
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
