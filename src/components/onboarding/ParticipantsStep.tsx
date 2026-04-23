import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Trash2, Edit, User, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import type { Participant } from "@/pages/Onboarding";

interface ParticipantsStepProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
  budgetEnabled?: boolean;
}

const emptyParticipant: Participant = {
  name: "",
  age: 0,
  occupation: "",
  hometown: "",
  bio: "",
  photoUrl: "",
  gender: "",
  status: "active",
  availableFromEpisode: null,
  price: null,
};

export default function ParticipantsStep({ participants, onChange, budgetEnabled }: ParticipantsStepProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant>(emptyParticipant);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      setCurrentParticipant(participants[index]);
    } else {
      setEditingIndex(null);
      setCurrentParticipant(emptyParticipant);
    }
    setPhotoError(null);
    setIsDialogOpen(true);
  };

  const handleSaveParticipant = () => {
    if (!currentParticipant.name.trim()) return;
    if (budgetEnabled && (currentParticipant.price == null || currentParticipant.price <= 0)) {
      toast({ title: t('admin.priceRequired', 'Price is required when budget is enabled'), variant: "destructive" });
      return;
    }

    if (editingIndex !== null) {
      const updated = [...participants];
      updated[editingIndex] = currentParticipant;
      onChange(updated);
    } else {
      onChange([...participants, currentParticipant]);
    }
    setIsDialogOpen(false);
    setCurrentParticipant(emptyParticipant);
    setEditingIndex(null);
  };

  const handleDeleteParticipant = () => {
    if (deleteIndex !== null) {
      onChange(participants.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const handleFieldChange = (field: keyof Participant, value: string | number) => {
    setCurrentParticipant({ ...currentParticipant, [field]: value });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;

    setPhotoError(null);

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setPhotoError(t('onboarding.participants.uploadImageFormats'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(t('onboarding.participants.uploadImageSize'));
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `participant-${Date.now()}.${fileExt}`;
      const filePath = `participants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("show-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("show-assets")
        .getPublicUrl(filePath);

      handleFieldChange("photoUrl", urlData.publicUrl);
    } catch (error: any) {
      setPhotoError(error.message || t('onboarding.participants.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">{t('nav.participants')}</h3>
          <p className="text-sm text-white/60">
            {participants.length === 0
              ? t('onboarding.participants.emptyState')
              : t('onboarding.participants.count', { count: participants.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {participants.length > 0 && (
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "card" ? "bg-primary text-white" : "text-white/60 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list" ? "bg-primary text-white" : "text-white/60 hover:text-white"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.addParticipant')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-[#0F172A] border-white/20 max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingIndex !== null ? t('admin.editParticipant') : t('admin.addParticipant')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                    />
                    <div className="w-24 h-24 rounded-full bg-[#1A2332] flex items-center justify-center border-2 border-dashed border-white/30 overflow-hidden">
                      {currentParticipant.photoUrl ? (
                        <img
                          src={currentParticipant.photoUrl}
                          alt="Participant"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-white/40" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  {photoError && (
                    <p className="text-xs text-red-400 mt-1">{photoError}</p>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">{t('common.name')}</Label>
                    <Input
                      placeholder={t('forms.enterName')}
                      value={currentParticipant.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      className="onboarding-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">{t('common.age')}</Label>
                    <Input
                      type="number"
                      placeholder={t('onboarding.participants.enterAge')}
                      value={currentParticipant.age || ""}
                      onChange={(e) => handleFieldChange("age", parseInt(e.target.value) || 0)}
                      className="onboarding-input"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label className="text-white">
                    {t('common.gender')} <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={currentParticipant.gender}
                    onValueChange={(value) => handleFieldChange("gender", value)}
                  >
                    <SelectTrigger className="onboarding-input">
                      <SelectValue placeholder={t('common.selectGender')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A2332] border-white/20">
                      <SelectItem value="male" className="text-white hover:bg-white/10">{t('common.male')}</SelectItem>
                      <SelectItem value="female" className="text-white hover:bg-white/10">{t('common.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">{t('common.occupation')}</Label>
                    <Input
                      placeholder={t('onboarding.participants.enterOccupation')}
                      value={currentParticipant.occupation}
                      onChange={(e) => handleFieldChange("occupation", e.target.value)}
                      className="onboarding-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">{t('common.hometown')}</Label>
                    <Input
                      placeholder={t('onboarding.participants.enterHometown')}
                      value={currentParticipant.hometown}
                      onChange={(e) => handleFieldChange("hometown", e.target.value)}
                      className="onboarding-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">{t('common.bio')}</Label>
                  <Textarea
                    placeholder={t('onboarding.participants.enterBio')}
                    value={currentParticipant.bio}
                    onChange={(e) => handleFieldChange("bio", e.target.value)}
                    className="onboarding-input resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">{t('onboarding.participants.availableFromEpisode')}</Label>
                  <Input
                    type="number"
                    placeholder={t('onboarding.participants.immediateAvailability')}
                    value={currentParticipant.availableFromEpisode || ""}
                    onChange={(e) => handleFieldChange("availableFromEpisode", e.target.value ? parseInt(e.target.value) : null)}
                    className="onboarding-input"
                    min={1}
                  />
                  <p className="text-xs text-white/50">
                    {t('onboarding.participants.episodeDescription')}
                  </p>
                </div>

                {/* Price field - only shown when budget is enabled */}
                {budgetEnabled && (
                  <div className="space-y-2">
                    <Label className="text-white">{t('onboarding.participants.price', 'Price')} <span className="text-red-400">*</span></Label>
                    <Input
                      type="number"
                      placeholder="e.g. 10"
                      value={currentParticipant.price || ""}
                      onChange={(e) => handleFieldChange("price", e.target.value ? parseInt(e.target.value) : null)}
                      className={`onboarding-input ${budgetEnabled && (currentParticipant.price == null || currentParticipant.price <= 0) ? 'border-red-400' : ''}`}
                      min={1}
                      required
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="bg-primary hover:bg-primary/90 text-white border-primary"
                  >
                    {t('common.discard')}
                  </Button>
                  <Button
                    onClick={handleSaveParticipant}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {editingIndex !== null ? t('common.save') : t('common.add')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card View */}
      {participants.length > 0 && viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((participant, index) => (
            <div
              key={index}
              className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center gap-4 hover:bg-white/15 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {participant.photoUrl ? (
                  <img
                    src={participant.photoUrl}
                    alt={participant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{participant.name}</p>
                <p className="text-sm text-white/60 truncate">
                  {participant.occupation || t('onboarding.participants.noOccupation')} | {participant.age || "-"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(index)}
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteIndex(index)}
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {participants.length > 0 && viewMode === "list" && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                <TableHead className="text-white/60">{t('onboarding.review.no')}</TableHead>
                <TableHead className="text-white/60">{t('common.name')}</TableHead>
                <TableHead className="text-white/60">{t('common.age')}</TableHead>
                <TableHead className="text-white/60">{t('common.occupation')}</TableHead>
                <TableHead className="text-white/60">{t('admin.info')}</TableHead>
                <TableHead className="text-white/60 text-right">{t('admin.action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant, index) => (
                <TableRow key={index} className="border-white/10">
                  <TableCell className="font-medium text-white">{index + 1}</TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {participant.photoUrl ? (
                          <img
                            src={participant.photoUrl}
                            alt={participant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-white/40" />
                        )}
                      </div>
                      {participant.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70">{participant.age || "-"}</TableCell>
                  <TableCell className="text-white/70">{participant.occupation || "-"}</TableCell>
                  <TableCell className="text-white/70">{participant.hometown || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(index)}
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteIndex(index)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
      {participants.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('onboarding.participants.emptyState')}</p>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
        onConfirm={handleDeleteParticipant}
        title={t('admin.deleteParticipant')}
        description={t('admin.confirmDeleteParticipant')}
      />
    </div>
  );
}
