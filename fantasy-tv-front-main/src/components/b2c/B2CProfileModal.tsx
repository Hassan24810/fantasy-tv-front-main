import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface B2CProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showUserId: string;
  userId: string;
  currentUsername: string;
  currentAvatarUrl: string | null;
  showId: string;
  onProfileUpdated: (username: string, avatarUrl: string | null) => void;
}

export const B2CProfileModal = ({
  open,
  onOpenChange,
  showUserId,
  userId,
  currentUsername,
  currentAvatarUrl,
  showId,
  onProfileUpdated,
}: B2CProfileModalProps) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState(currentUsername);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkUsernameAvailability = async (newUsername: string): Promise<boolean> => {
    if (newUsername.toLowerCase().trim() === currentUsername.toLowerCase().trim()) {
      return true;
    }

    const { data } = await supabase
      .from("show_users")
      .select("id")
      .eq("show_id", showId)
      .ilike("username", newUsername.trim())
      .neq("id", showUserId)
      .maybeSingle();

    return !data;
  };

  const handleUsernameChange = async (value: string) => {
    setUsername(value);
    setUsernameError(null);

    if (value.trim().length < 2) {
      setUsernameError(t('validation.minLength', { min: 2 }));
      return;
    }

    const isAvailable = await checkUsernameAvailability(value);
    if (!isAvailable) {
      setUsernameError(t('validation.usernameTaken'));
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('validation.fileTooLarge', { size: 5 }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('validation.invalidFileType', { types: 'JPG, PNG, GIF, WebP' }));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success(t('profile.avatarUpdated'));
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(t('toast.errorOccurred'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
  };

  const handleSave = async () => {
    if (usernameError) return;
    if (username.trim().length < 2) {
      setUsernameError(t('validation.minLength', { min: 2 }));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("show_users")
        .update({
          username: username.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", showUserId);

      if (error) throw error;

      onProfileUpdated(username.trim(), avatarUrl);
      toast.success(t('profile.usernameUpdated'));
      onOpenChange(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(t('toast.errorOccurred'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profile.editProfile')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {t('profile.uploadAvatar')}
            </Button>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <Label htmlFor="username">{t('profile.username')}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className={usernameError ? "border-red-500" : ""}
            />
            {usernameError && (
              <p className="text-sm text-red-500">{usernameError}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !!usernameError}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {t('profile.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
