import { useState, useMemo, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { generateTemplatePreview, validateTemplatePlaceholders } from "@/lib/eventDisplayUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { IconPicker } from "./IconPicker";

interface AddRuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (rule: {
    title: string;
    description: string;
    points: number;
    template: string;
    icon: string;
    eventType: string;
    participantsCount: number;
    participantCountMode: "exact" | "variable";
    pointsPerPosition: number[];
    isElimination: boolean;
    eliminatedPosition?: number;
  }) => Promise<boolean>;
}

export function AddRuleSheet({ open, onOpenChange, onAdd }: AddRuleSheetProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template: "",
    icon: "star",
    customIconUrl: "",
    eventType: "positive", // Hidden, always positive
    participantsCount: 1,
    participantCountMode: "exact" as const,
    pointsPerPosition: [0] as number[],
    isElimination: false,
    eliminatedPosition: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [iconMode, setIconMode] = useState<"preset" | "custom">("preset");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      template: "",
      icon: "star",
      customIconUrl: "",
      eventType: "positive",
      participantsCount: 1,
      participantCountMode: "exact",
      pointsPerPosition: [0],
      isElimination: false,
      eliminatedPosition: 1,
    });
    setIconMode("preset");
    setErrors({});
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t('admin.pleaseUploadImage'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('admin.imageTooLarge'));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("rule-icons")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("rule-icons")
        .getPublicUrl(filePath);

      setFormData({ ...formData, customIconUrl: publicUrl, icon: publicUrl });
      toast.success(t('admin.iconUploaded'));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t('admin.uploadFailed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCustomIcon = async () => {
    if (formData.customIconUrl) {
      // Extract file path from URL
      const urlParts = formData.customIconUrl.split("/rule-icons/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("rule-icons").remove([filePath]);
      }
    }
    setFormData({ ...formData, customIconUrl: "", icon: "star" });
    setIconMode("preset");
  };

  // Update points per position array when participant count changes
  const handleParticipantCountChange = (count: number) => {
    const newPoints = [...formData.pointsPerPosition];
    while (newPoints.length < count) {
      newPoints.push(0);
    }
    // Reset eliminated position if it exceeds new count
    const newEliminatedPosition = formData.eliminatedPosition > count ? 1 : formData.eliminatedPosition;
    setFormData({
      ...formData,
      participantsCount: count,
      pointsPerPosition: newPoints.slice(0, count),
      eliminatedPosition: newEliminatedPosition,
    });
  };

  // Update a specific position's points
  const handlePointsChange = (position: number, value: number) => {
    const newPoints = [...formData.pointsPerPosition];
    newPoints[position] = value;
    setFormData({ ...formData, pointsPerPosition: newPoints });
  };

  // Live preview
  const previewText = useMemo(() => {
    if (!formData.template.trim()) {
      return "";
    }
    return generateTemplatePreview(
      formData.template,
      formData.pointsPerPosition,
      formData.participantsCount
    );
  }, [formData.template, formData.pointsPerPosition, formData.participantsCount]);

  // Template validation
  const templateValidation = useMemo(() => {
    return validateTemplatePlaceholders(
      formData.template,
      formData.participantsCount,
      formData.participantCountMode
    );
  }, [formData.template, formData.participantsCount, formData.participantCountMode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = t('validation.required');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('validation.required');
    }

    if (!templateValidation.valid) {
      newErrors.template = templateValidation.error || t('admin.invalidTemplate');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await onAdd({
      title: formData.title.trim(),
      description: formData.description.trim(),
      points: formData.pointsPerPosition[0] || 0,
      template: formData.template.trim(),
      icon: formData.icon,
      eventType: formData.eventType,
      participantsCount: formData.participantsCount,
      participantCountMode: formData.participantCountMode,
      pointsPerPosition: formData.pointsPerPosition,
      isElimination: formData.isElimination,
      eliminatedPosition: formData.isElimination ? formData.eliminatedPosition : undefined,
    });

    setIsSubmitting(false);
    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const canSubmit = formData.title.trim() && formData.description.trim() && templateValidation.valid;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <SheetContent className="w-[540px] sm:w-[600px] bg-white border-l border-slate-200 p-0 overflow-y-auto">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-xl font-semibold text-slate-900">{t('admin.addNewRule')}</SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            {t('admin.addRuleDescription')}
          </SheetDescription>
        </SheetHeader>
        
        <div className="px-6 pb-6 space-y-5">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">{t('admin.ruleName')} *</Label>
            <Input
              id="title"
              placeholder="e.g. First Kiss"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={cn(
                "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-11",
                errors.title && "border-red-500"
              )}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Icon */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">{t('admin.icon')}</Label>
            <Tabs value={iconMode} onValueChange={(v) => setIconMode(v as "preset" | "custom")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                <TabsTrigger value="preset" className="text-sm">{t('admin.chooseIcon')}</TabsTrigger>
                <TabsTrigger value="custom" className="text-sm">{t('admin.uploadCustom')}</TabsTrigger>
              </TabsList>
              <TabsContent value="preset" className="mt-3">
                <IconPicker
                  value={formData.customIconUrl ? "" : formData.icon}
                  onChange={(value) => setFormData({ ...formData, icon: value, customIconUrl: "" })}
                />
              </TabsContent>
              <TabsContent value="custom" className="mt-3">
                {formData.customIconUrl ? (
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <img
                      src={formData.customIconUrl}
                      alt={t('admin.customIcon')}
                      className="h-12 w-12 object-contain rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{t('admin.customIconUploaded')}</p>
                      <p className="text-xs text-slate-500">{t('admin.clickRemoveToChange')}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCustomIcon}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-primary/50 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      className="hidden"
                      id="icon-upload"
                    />
                    <label
                      htmlFor="icon-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                      ) : (
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      )}
                      <span className="text-sm font-medium text-slate-700">
                        {isUploading ? t('forms.uploading') : t('admin.clickToUpload')}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">{t('admin.imageFormats')}</span>
                    </label>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Number of Participants */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">{t('admin.numberOfParticipants')}</Label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleParticipantCountChange(n)}
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 font-semibold transition-colors",
                    formData.participantsCount === n
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Points Per Position */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">
              {t('admin.pointsPerPosition')}
            </Label>
            <div className="grid gap-3">
              {formData.pointsPerPosition.map((points, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <Label className="text-sm text-slate-600 w-32">{t('admin.position', { number: idx + 1 })}:</Label>
                  <Input
                    type="number"
                    value={points}
                    onChange={(e) => handlePointsChange(idx, parseInt(e.target.value) || 0)}
                    className="w-24 h-9 bg-white"
                  />
                  <span className="text-sm text-slate-500">{t('common.points')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Display Template */}
          <div className="space-y-2">
            <Label htmlFor="template" className="text-sm font-medium text-slate-700">
              {t('admin.displayTemplate')}
            </Label>
            <Textarea
              id="template"
              placeholder="{P1} kissed {P2}"
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              className={cn(
                "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 min-h-[60px] resize-none",
                errors.template && "border-red-500"
              )}
            />
            <p className="text-xs text-slate-500">
              {t('admin.templateHint')}
            </p>
            {errors.template && <p className="text-xs text-red-500">{errors.template}</p>}
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <Label className="text-sm font-medium text-primary mb-2 block">{t('admin.livePreview')}</Label>
            <p className="text-lg text-slate-900">
              {previewText || <span className="text-slate-400 italic">{t('admin.enterTemplateToPreview')}</span>}
            </p>
          </div>

          {/* Elimination Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-amber-900">{t('admin.eliminationRule')}</Label>
                <p className="text-xs text-amber-700">
                  {t('admin.eliminationRuleDescription')}
                </p>
              </div>
              <Switch
                checked={formData.isElimination}
                onCheckedChange={(checked) => setFormData({ ...formData, isElimination: checked })}
              />
            </div>
            
            {/* Eliminated Position Selector */}
            {formData.isElimination && (
              <div className="ml-4 p-3 bg-amber-50/50 rounded-lg border border-amber-200/50">
                <Label className="text-sm font-medium text-amber-900 mb-2 block">
                  {t('admin.whichParticipantEliminated')}
                </Label>
                <Select
                  value={formData.eliminatedPosition.toString()}
                  onValueChange={(v) => setFormData({ ...formData, eliminatedPosition: parseInt(v) })}
                >
                  <SelectTrigger className="bg-white border-amber-200 h-10 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {Array.from({ length: formData.participantsCount }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        <span className="text-slate-900">{t('admin.position', { number: i + 1 })}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Description (required) */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">{t('admin.description')} *</Label>
            <Textarea
              id="description"
              placeholder={t('admin.describeRulePlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={cn(
                "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 min-h-[60px] resize-none",
                errors.description && "border-red-500"
              )}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-11"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? t('common.creating') : t('admin.createRule')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { allIconOptions as iconOptions } from "./IconPicker";
