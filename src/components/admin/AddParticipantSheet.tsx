import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, HelpCircle, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AddParticipantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetEnabled?: boolean;
  showId: string;
  onParticipantAdded?: () => void;
}

export function AddParticipantSheet({ open, onOpenChange, budgetEnabled, showId, onParticipantAdded }: AddParticipantSheetProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    occupation: "",
    info: "",
    gender: "",
    status: "active",
    visibility: "show",
    photoUrl: "",
    availableFromEpisode: "",
    price: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      age: "",
      occupation: "",
      info: "",
      gender: "",
      status: "active",
      visibility: "show",
      photoUrl: "",
      availableFromEpisode: "",
      price: "",
    });
    setPhotoFile(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: t('admin.nameRequired', 'Name is required'), variant: "destructive" });
      return;
    }
    if (budgetEnabled && (!formData.price || Number(formData.price) <= 0)) {
      toast({ title: t('admin.priceRequired', 'Price is required when budget is enabled'), variant: "destructive" });
      return;
    }
    if (!showId) return;

    setIsSubmitting(true);

    try {
      // Upload photo if selected
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `participant-${Date.now()}.${fileExt}`;
        const filePath = `participants/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("show-assets")
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("show-assets")
          .getPublicUrl(filePath);

        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("participants").insert({
        show_id: showId,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        occupation: formData.occupation || null,
        bio: formData.info || null,
        gender: formData.gender || null,
        status: formData.status,
        visibility: formData.visibility === "hide" ? "hidden" : "show",
        photo_url: photoUrl,
        available_from_episode: formData.availableFromEpisode ? parseInt(formData.availableFromEpisode) : null,
        price: formData.price ? parseInt(formData.price) : null,
      });

      if (error) throw error;

      toast({ title: t('common.success'), description: t('admin.participantAdded', 'Participant added successfully') });
      resetForm();
      onOpenChange(false);
      onParticipantAdded?.();
    } catch (error: any) {
      console.error("[AddParticipantSheet] Error:", error);
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, photoUrl: url });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg bg-white border-slate-200 overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold text-slate-900">{t('admin.addParticipant')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-slate-50"
              >
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Name & Age */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-1">
                {t('admin.name')}
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              </Label>
              <Input
                placeholder={t('common.typeHere')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-1">
                {t('admin.age')}
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              </Label>
              <Input
                type="number"
                placeholder={t('common.typeHere')}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="text-slate-700">
              {t('admin.gender')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue placeholder={t('admin.selectGender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('admin.male')}</SelectItem>
                <SelectItem value="female">{t('admin.female')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Occupation */}
          <div className="space-y-2">
            <Label className="text-slate-700 flex items-center gap-1">
              {t('admin.occupation')}
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </Label>
            <Input
              placeholder={t('common.typeHere')}
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Info */}
          <div className="space-y-2">
            <Label className="text-slate-700 flex items-center gap-1">
              {t('admin.info')}
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </Label>
            <Textarea
              placeholder={t('common.typeHere')}
              value={formData.info}
              onChange={(e) => setFormData({ ...formData, info: e.target.value })}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 min-h-[100px] resize-none"
            />
          </div>

          {/* Available From Episode */}
          <div className="space-y-2">
            <Label className="text-slate-700 flex items-center gap-1">
              {t('admin.availableFromEpisode')}
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </Label>
            <Input
              type="number"
              placeholder={t('admin.leaveEmptyForImmediate')}
              value={formData.availableFromEpisode}
              onChange={(e) => setFormData({ ...formData, availableFromEpisode: e.target.value })}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              min={1}
            />
            <p className="text-xs text-slate-500">
              {t('admin.availableFromEpisodeDescription')}
            </p>
          </div>

          {/* Price (conditional on budget mode) */}
          {budgetEnabled && (
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-1">
                {t('admin.price', 'Price')} <span className="text-destructive">*</span>
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              </Label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                min={1}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-slate-700">{t('admin.participantStatus')}</Label>
              <RadioGroup
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="status-active" className="border-primary text-primary" />
                  <Label htmlFor="status-active" className="text-slate-600 font-normal cursor-pointer">{t('admin.active')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="status-inactive" className="border-slate-300" />
                  <Label htmlFor="status-inactive" className="text-slate-600 font-normal cursor-pointer">{t('admin.inactive')}</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-700">{t('admin.visibilityOnSite')}</Label>
              <RadioGroup
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="show" id="visibility-show" className="border-primary text-primary" />
                  <Label htmlFor="visibility-show" className="text-slate-600 font-normal cursor-pointer">{t('common.show')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hide" id="visibility-hide" className="border-slate-300" />
                  <Label htmlFor="visibility-hide" className="text-slate-600 font-normal cursor-pointer">{t('common.hide')}</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Upload Media */}
          <div className="space-y-2">
            <Label className="text-slate-700 flex items-center gap-1">
              {t('admin.uploadMedia')}
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </Label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-5 w-5 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">{t('admin.uploadMedia')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 px-6"
              disabled={isSubmitting}
            >
              {t('common.discard')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-white px-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.loading', 'Saving...') : t('common.add')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
