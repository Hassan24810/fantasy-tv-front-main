import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, MessageCircle, Link2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface B2CShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareType: "team" | "score";
  showName: string;
  teamNames?: string[];
  totalPoints?: number;
  rank?: number;
  shareUrl: string;
}

export const B2CShareModal = ({
  open,
  onOpenChange,
  shareType,
  showName,
  teamNames = [],
  totalPoints = 0,
  rank,
  shareUrl,
}: B2CShareModalProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const getShareText = () => {
    if (shareType === "team") {
      const teamStr = teamNames.slice(0, 3).join(", ") + (teamNames.length > 3 ? "..." : "");
      return t('sharing.myTeamIs', { show: showName, team: teamStr });
    }
    
    const rankText = rank ? `#${rank}` : "";
    return `I scored ${totalPoints} points ${rankText} in Fantasy ${showName}! 🏆`;
  };

  const shareText = getShareText();
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      toast.success(t('sharing.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('toast.errorOccurred'));
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shareType === "team" ? t('sharing.shareTeam') : t('sharing.shareScore')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Preview */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm text-foreground">{shareText}</p>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleShare('facebook')}
            >
              <Facebook className="w-5 h-5 text-[#1877F2]" />
              {t('sharing.shareOnFacebook')}
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleShare('twitter')}
            >
              <Twitter className="w-5 h-5 text-foreground" />
              {t('sharing.shareOnTwitter')}
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleShare('whatsapp')}
            >
              <MessageCircle className="w-5 h-5 text-[#25D366]" />
              {t('sharing.shareOnWhatsApp')}
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Link2 className="w-5 h-5" />
              )}
              {t('sharing.copyLink')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
