import { useState, useMemo, useRef } from "react";
import { Upload, Loader2, X, Plus, Trash2, Edit, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { generateTemplatePreview, validateTemplatePlaceholders } from "@/lib/eventDisplayUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import type { GameRule } from "@/pages/Onboarding";
import { IconPicker, allIconOptions } from "@/components/admin/IconPicker";

interface GameRulesStepProps {
  rules: GameRule[];
  onChange: (rules: GameRule[]) => void;
}

const iconOptions = allIconOptions;

const eventTypes = [
  { value: "positive", label: "Positive Event" },
  { value: "negative", label: "Negative Event" },
  { value: "bonus", label: "Bonus Event" },
  { value: "elimination", label: "Elimination" },
  { value: "social", label: "Social Event" },
];

const emptyRule: GameRule = {
  eventType: "positive",
  eventName: "",
  points: 0,
  description: "",
  template: "",
  icon: "star",
  participantsCount: 1,
  participantCountMode: "exact",
  pointsPerPosition: [0],
  isElimination: false,
  eliminatedPosition: 1,
};

export default function GameRulesStep({ rules, onChange }: GameRulesStepProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentRule, setCurrentRule] = useState<GameRule>(emptyRule);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [iconMode, setIconMode] = useState<"preset" | "custom">("preset");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenSheet = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      const rule = rules[index];
      setCurrentRule({
        ...rule,
        participantsCount: rule.participantsCount || 1,
        participantCountMode: rule.participantCountMode || "exact",
        pointsPerPosition: rule.pointsPerPosition || [rule.points || 0],
        isElimination: rule.isElimination || false,
        eliminatedPosition: rule.eliminatedPosition || 1,
      });
      // Check if icon is a URL (custom) or preset
      if (rule.icon?.startsWith("http")) {
        setIconMode("custom");
      } else {
        setIconMode("preset");
      }
    } else {
      setEditingIndex(null);
      setCurrentRule(emptyRule);
      setIconMode("preset");
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setCurrentRule(emptyRule);
    setIconMode("preset");
    setErrors({});
    setEditingIndex(null);
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
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

      setCurrentRule({ ...currentRule, icon: publicUrl });
      toast.success("Icon uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload icon");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCustomIcon = async () => {
    if (currentRule.icon?.startsWith("http")) {
      const urlParts = currentRule.icon.split("/rule-icons/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("rule-icons").remove([filePath]);
      }
    }
    setCurrentRule({ ...currentRule, icon: "star" });
    setIconMode("preset");
  };

  const handleParticipantCountChange = (count: number) => {
    const newPoints = [...currentRule.pointsPerPosition];
    while (newPoints.length < count) {
      newPoints.push(0);
    }
    const newEliminatedPosition = (currentRule.eliminatedPosition || 1) > count ? 1 : currentRule.eliminatedPosition;
    setCurrentRule({
      ...currentRule,
      participantsCount: count,
      pointsPerPosition: newPoints.slice(0, count),
      eliminatedPosition: newEliminatedPosition,
    });
  };

  const handlePointsChange = (position: number, value: number) => {
    const newPoints = [...currentRule.pointsPerPosition];
    newPoints[position] = value;
    setCurrentRule({ ...currentRule, pointsPerPosition: newPoints, points: newPoints[0] || 0 });
  };

  const previewText = useMemo(() => {
    if (!currentRule.template?.trim()) {
      return "";
    }
    return generateTemplatePreview(
      currentRule.template,
      currentRule.pointsPerPosition,
      currentRule.participantsCount
    );
  }, [currentRule.template, currentRule.pointsPerPosition, currentRule.participantsCount]);

  const templateValidation = useMemo(() => {
    return validateTemplatePlaceholders(
      currentRule.template,
      currentRule.participantsCount,
      currentRule.participantCountMode
    );
  }, [currentRule.template, currentRule.participantsCount, currentRule.participantCountMode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!currentRule.eventName.trim()) {
      newErrors.eventName = "Rule name is required";
    }

    if (!currentRule.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!templateValidation.valid) {
      newErrors.template = templateValidation.error || "Invalid template";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveRule = () => {
    if (!validate()) return;

    const ruleToSave: GameRule = {
      ...currentRule,
      eventName: currentRule.eventName.trim(),
      description: currentRule.description.trim(),
      template: currentRule.template?.trim() || "",
      points: currentRule.pointsPerPosition[0] || 0,
    };

    if (editingIndex !== null) {
      const updated = [...rules];
      updated[editingIndex] = ruleToSave;
      onChange(updated);
    } else {
      onChange([...rules, ruleToSave]);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteRule = () => {
    if (deleteIndex !== null) {
      onChange(rules.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "positive":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "negative":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      case "bonus":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "elimination":
        return "bg-purple-500/20 text-purple-600 border-purple-500/30";
      case "social":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      default:
        return "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  const canSubmit = currentRule.eventName.trim() && currentRule.description.trim() && templateValidation.valid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-card-foreground">Game Rules</h3>
          <p className="text-sm text-muted-foreground">
            {rules.length === 0
              ? "Define scoring rules for your game"
              : `${rules.length} rule${rules.length !== 1 ? "s" : ""} defined`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {rules.length > 0 && (
            <div className="flex items-center bg-background/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
          <Button
            onClick={() => handleOpenSheet()}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Card View */}
      {rules.length > 0 && viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(
                    rule.eventType
                  )}`}
                >
                  {eventTypes.find((t) => t.value === rule.eventType)?.label || rule.eventType}
                </div>
                <div className="flex gap-1">
                  {rule.pointsPerPosition?.map((pts, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-bold",
                        pts >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}
                    >
                      {pts > 0 ? `+${pts}` : pts}
                    </span>
                  )) || (
                    <span className="text-lg font-bold text-primary">
                      {rule.points > 0 ? `+${rule.points}` : rule.points}
                    </span>
                  )}
                </div>
              </div>
              <h4 className="font-medium text-card-foreground mb-1">{rule.eventName}</h4>
              {rule.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{rule.description}</p>
              )}
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenSheet(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-card-foreground"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteIndex(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {rules.length > 0 && viewMode === "list" && (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-background/10 hover:bg-background/10">
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Event Name</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground">Points</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => (
                <TableRow key={index} className="border-border/50">
                  <TableCell>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium inline-block ${getEventTypeColor(
                        rule.eventType
                      )}`}
                    >
                      {eventTypes.find((t) => t.value === rule.eventType)?.label || rule.eventType}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-card-foreground">{rule.eventName}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {rule.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {rule.pointsPerPosition?.map((pts, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold",
                            pts >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          )}
                        >
                          {pts > 0 ? `+${pts}` : pts}
                        </span>
                      )) || (
                        <span className={rule.points >= 0 ? "text-green-400" : "text-red-400"}>
                          {rule.points > 0 ? `+${rule.points}` : rule.points}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenSheet(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-card-foreground"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteIndex(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {rules.length === 0 && (
        <button
          onClick={() => handleOpenSheet()}
          className="w-full text-center py-16 border-2 border-dashed border-border/50 rounded-xl hover:border-primary/50 hover:bg-background/10 transition-colors cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full bg-background/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
            <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-muted-foreground font-medium">Press to add a Rule from your show</p>
        </button>
      )}

      {/* Add/Edit Rule Sheet */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setIsDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-white">
              {editingIndex !== null ? t('admin.editRule') : t('admin.addNewRule')}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70">
              {t('admin.addRuleDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
            <div className="space-y-5">
              {/* Rule Name */}
              <div className="space-y-2">
                <Label htmlFor="eventName" className="text-sm font-medium text-white">{t('admin.ruleName')} *</Label>
                <Input
                  id="eventName"
                  placeholder="e.g. First Kiss"
                  value={currentRule.eventName}
                  onChange={(e) => setCurrentRule({ ...currentRule, eventName: e.target.value })}
                  className={cn(
                    "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-11",
                    errors.eventName && "border-red-500"
                  )}
                />
                {errors.eventName && <p className="text-xs text-red-500">{errors.eventName}</p>}
              </div>

              {/* Icon */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-white">{t('admin.icon')}</Label>
                <Tabs value={iconMode} onValueChange={(v) => setIconMode(v as "preset" | "custom")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10">
                    <TabsTrigger value="preset" className="text-sm text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">{t('admin.chooseIcon')}</TabsTrigger>
                    <TabsTrigger value="custom" className="text-sm text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">{t('admin.uploadCustom')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preset" className="mt-3">
                    <IconPicker
                      value={currentRule.icon?.startsWith("http") ? "" : currentRule.icon || "star"}
                      onChange={(value) => setCurrentRule({ ...currentRule, icon: value })}
                    />
                  </TabsContent>
                  <TabsContent value="custom" className="mt-3">
                    {currentRule.icon?.startsWith("http") ? (
                      <div className="flex items-center gap-4 p-4 bg-white/10 rounded-lg border border-white/20">
                        <img
                          src={currentRule.icon}
                          alt="Custom icon"
                          className="h-12 w-12 object-contain rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Custom icon uploaded</p>
                          <p className="text-xs text-white/70">Click remove to upload a different icon</p>
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
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors">
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
                            <Upload className="h-8 w-8 text-white/60 mb-2" />
                          )}
                          <span className="text-sm font-medium text-white">
                            {isUploading ? "Uploading..." : "Click to upload"}
                          </span>
                          <span className="text-xs text-white/60 mt-1">PNG, JPG, SVG up to 2MB</span>
                        </label>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Number of Participants */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-white">{t('admin.numberOfParticipants')}</Label>
                
                {/* Mode Selector */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCurrentRule({ ...currentRule, participantCountMode: "exact" })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      currentRule.participantCountMode === "exact"
                        ? "bg-primary text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                  >
                    {t('admin.fixedCount')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentRule({ ...currentRule, participantCountMode: "variable" })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      currentRule.participantCountMode === "variable"
                        ? "bg-primary text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                  >
                    {t('admin.variableCount')}
                  </button>
                </div>
                
                {/* Number Selector */}
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleParticipantCountChange(n)}
                      className={cn(
                        "w-12 h-12 rounded-lg border-2 font-semibold transition-colors",
                        currentRule.participantsCount === n
                          ? "border-primary bg-primary text-white"
                          : "border-white/30 text-white hover:border-white/50"
                      )}
                    >
                      {currentRule.participantCountMode === "variable" ? `${n}+` : n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/60">
                  {currentRule.participantCountMode === "variable" 
                    ? t('admin.variableCountHint', { defaultValue: 'Event can have this many or more participants' })
                    : t('admin.fixedCountHint', { defaultValue: 'Event will have exactly this many participants' })}
                </p>
              </div>

              {/* Points Per Position */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-white">
                  {t('admin.pointsPerPosition')}
                </Label>
                <div className="grid gap-3">
                  {currentRule.pointsPerPosition.map((points, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/20">
                      <Label className="text-sm text-white/80 w-32">{t('admin.position', { number: idx + 1 })}:</Label>
                      <Input
                        type="number"
                        value={points}
                        onChange={(e) => handlePointsChange(idx, parseInt(e.target.value) || 0)}
                        className="w-24 h-9 bg-white"
                      />
                      <span className="text-sm text-white/70">{t('common.points')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Display Template */}
              <div className="space-y-2">
                <Label htmlFor="template" className="text-sm font-medium text-white">
                  {t('admin.displayTemplate')}
                </Label>
                <Textarea
                  id="template"
                  placeholder="{P1} kissed {P2}"
                  value={currentRule.template || ""}
                  onChange={(e) => setCurrentRule({ ...currentRule, template: e.target.value })}
                  className={cn(
                    "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 min-h-[60px] resize-none",
                    errors.template && "border-red-500"
                  )}
                />
                <p className="text-xs text-white/60">
                  Use {"{P1}"}, {"{P2}"}, etc. for participant placeholders.
                </p>
                {errors.template && <p className="text-xs text-red-500">{errors.template}</p>}
              </div>

              {/* Live Preview */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30">
                <Label className="text-sm font-medium text-primary mb-2 block">{t('admin.livePreview')}</Label>
                <p className="text-lg text-white">
                  {previewText || <span className="text-white/50 italic">{t('admin.enterTemplateToPreview')}</span>}
                </p>
              </div>

              {/* Elimination Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-amber-200">{t('admin.eliminationRule')}</Label>
                    <p className="text-xs text-amber-300/80">
                      {t('admin.eliminationRuleDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={currentRule.isElimination}
                    onCheckedChange={(checked) => setCurrentRule({ ...currentRule, isElimination: checked })}
                  />
                </div>
                
                {/* Eliminated Position Selector */}
                {currentRule.isElimination && (
                  <div className="ml-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <Label className="text-sm font-medium text-amber-200 mb-2 block">
                      {t('admin.whichParticipantEliminated')}
                    </Label>
                    <Select
                      value={(currentRule.eliminatedPosition || 1).toString()}
                      onValueChange={(v) => setCurrentRule({ ...currentRule, eliminatedPosition: parseInt(v) })}
                    >
                      <SelectTrigger className="bg-white border-amber-200 h-10 w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        {Array.from({ length: currentRule.participantsCount }, (_, i) => (
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
                <Label htmlFor="description" className="text-sm font-medium text-white">{t('admin.description')} *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe when this rule applies..."
                  value={currentRule.description}
                  onChange={(e) => setCurrentRule({ ...currentRule, description: e.target.value })}
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
                  onClick={() => { resetForm(); setIsDialogOpen(false); }}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleSaveRule}
                  className="flex-1 h-11"
                  disabled={!canSubmit}
                >
                  {editingIndex !== null ? t('common.save') : t('admin.createRule')}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
        onConfirm={handleDeleteRule}
      />
    </div>
  );
}
