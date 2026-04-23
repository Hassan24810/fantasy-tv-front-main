import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HelpCircle, Upload, Pencil, Trash2, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Participant } from "@/pages/Participants";

interface EditParticipantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
  onParticipantUpdated?: () => void;
  budgetEnabled?: boolean;
}

export function EditParticipantSheet({ open, onOpenChange, participant, onParticipantUpdated, budgetEnabled }: EditParticipantSheetProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    occupation: "",
    info: "",
    gender: "",
    status: "active" as "active" | "inactive" | "customized",
    customStatusLabel: "",
    visibility: "show",
    photoUrl: "",
    availableFromEpisode: "",
    role: "",
    price: "",
  });
  const [attachments, setAttachments] = useState<{ name: string; type: string }[]>([
    { name: "Image.jpeg", type: "image" },
    { name: "Video.mp4", type: "video" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (participant) {
      setFormData({
        name: participant.name,
        age: participant.age.toString(),
        occupation: participant.occupation,
        info: participant.info,
        gender: participant.gender || "",
        status: participant.status,
        customStatusLabel: participant.customStatusLabel || "",
        visibility: participant.visibility,
        photoUrl: participant.photoUrl || "",
        availableFromEpisode: participant.availableFromEpisode?.toString() || "",
        role: participant.role || "",
        price: participant.price?.toString() || "",
      });
    }
  }, [participant]);

  const handleSubmit = async () => {
    if (!participant) return;
    if (budgetEnabled && (!formData.price || Number(formData.price) <= 0)) {
      toast({ title: t('admin.priceRequired', 'Price is required when budget is enabled'), variant: "destructive" });
      return;
    }

    // Validation: customized requires label
    if (formData.status === "customized" && !formData.customStatusLabel?.trim()) {
      toast({
        title: t('common.error'),
        description: t('admin.customStatusLabelRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("participants")
      .update({
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        occupation: formData.occupation || null,
        bio: formData.info || null,
        gender: formData.gender || null,
        status: formData.status,
        custom_status_label: formData.status === "customized" ? formData.customStatusLabel : null,
        available_from_episode: formData.availableFromEpisode ? parseInt(formData.availableFromEpisode) : null,
        role: formData.role || null,
        price: formData.price ? parseInt(formData.price) : null,
      })
      .eq("id", participant.id);

    setIsSubmitting(false);

    if (error) {
      console.error("[EditParticipantSheet] Error updating participant:", error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('common.success'),
      description: t('admin.participantUpdated'),
    });
    
    onParticipantUpdated?.();
    onOpenChange(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, photoUrl: url });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg bg-white border-slate-200 overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold text-slate-900">{t('admin.editParticipant')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={formData.photoUrl} />
                <AvatarFallback className="bg-blue-50 text-blue-600 text-2xl font-medium">
                  {formData.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
              >
                <Edit className="w-4 h-4 text-white" />
              </button>
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

          {/* Role / Label */}
          <div className="space-y-2">
            <Label className="text-slate-700 flex items-center gap-1">
              {t('admin.role')}
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </Label>
            <Input
              placeholder={t('admin.rolePlaceholder')}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500">
              {t('admin.roleDescription')}
            </p>
          </div>

          {/* Price (conditional on budget mode) */}
          {budgetEnabled && (
            <div className="space-y-2">
              <Label className="text-slate-700 flex items-center gap-1">
                {t('admin.price', 'Price')}
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              </Label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                min={0}
              />
            </div>
          )}
          <div className="space-y-3">
            <Label className="text-slate-700 flex items-center gap-1">
              {t('admin.attachments')}
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
                >
                  <span className="text-sm text-slate-700">{attachment.name}</span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 text-slate-400 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1 text-slate-400 hover:text-destructive"
                      onClick={() => removeAttachment(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="text-slate-700">{t('admin.participantStatus')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive" | "customized") => 
                setFormData({ ...formData, status: value, customStatusLabel: value !== "customized" ? "" : formData.customStatusLabel })
              }
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('admin.active')}</SelectItem>
                <SelectItem value="inactive">{t('admin.inactive')}</SelectItem>
                <SelectItem value="customized">{t('admin.customized')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Status Label - only shown when customized */}
            {formData.status === "customized" && (
              <div className="space-y-2 mt-3">
                <Label className="text-slate-700 flex items-center gap-1">
                  {t('admin.customStatusLabel')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder={t('admin.customStatusLabelPlaceholder')}
                  value={formData.customStatusLabel}
                  onChange={(e) => setFormData({ ...formData, customStatusLabel: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label className="text-slate-700">{t('admin.visibilityOnSite')}</Label>
            <RadioGroup
              value={formData.visibility}
              onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="show" id="edit-visibility-show" className="border-primary text-primary" />
                <Label htmlFor="edit-visibility-show" className="text-slate-600 font-normal cursor-pointer">{t('common.show')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hide" id="edit-visibility-hide" className="border-slate-300" />
                <Label htmlFor="edit-visibility-hide" className="text-slate-600 font-normal cursor-pointer">{t('common.hide')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Upload Media */}
          <div className="space-y-2">
            <Label className="text-slate-700">{t('admin.uploadMedia')}</Label>
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
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
