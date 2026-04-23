import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Megaphone, AlertTriangle, Sparkles, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ShowUpdate = Tables<"show_updates">;

interface B2CUpdatesCardProps {
  updates: ShowUpdate[];
}

function getTypeIcon(type: string) {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-4 w-4" />;
    case "hype":
      return <Sparkles className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

function getTypeStyles(type: string) {
  switch (type) {
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "hype":
      return "bg-purple-50 border-purple-200 text-purple-800";
    default:
      return "bg-blue-50 border-blue-200 text-blue-800";
  }
}

function isNew(publishAt: string) {
  const publishDate = new Date(publishAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 24;
}

function isVideoFile(url: string) {
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
}

function MediaRenderer({ url, className }: { url: string; className?: string }) {
  if (isVideoFile(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        className={`w-full rounded-lg object-contain bg-muted ${className || ""}`}
      />
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={`w-full rounded-lg object-cover ${className || ""}`}
    />
  );
}

export function B2CUpdatesCard({ updates }: B2CUpdatesCardProps) {
  const { t } = useTranslation();
  const [selectedUpdate, setSelectedUpdate] = useState<ShowUpdate | null>(null);

  if (updates.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5" />
            {t("updates.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {updates.map((update) => {
            const mediaUrl = update.media_url;
            const shouldTruncate = update.body.length > 100;
            const displayBody = shouldTruncate
              ? update.body.substring(0, 100) + "..."
              : update.body;

            return (
              <div
                key={update.id}
                onClick={() => setSelectedUpdate(update)}
                className={`rounded-lg border p-4 cursor-pointer transition-opacity hover:opacity-80 ${getTypeStyles(update.type || "info")}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getTypeIcon(update.type || "info")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{update.title}</h4>
                      {isNew(update.publish_at) && (
                        <Badge variant="default" className="text-xs bg-primary">
                          {t("updates.new")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm line-clamp-2">{displayBody}</p>
                    {mediaUrl && (
                      <div className="mt-2 max-h-48 overflow-hidden rounded-lg">
                        <MediaRenderer url={mediaUrl} className="max-h-48" />
                      </div>
                    )}
                    <p className="mt-2 text-xs opacity-70">
                      {t("updates.publishedAgo", {
                        time: formatDistanceToNow(new Date(update.publish_at), { addSuffix: true }),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUpdate} onOpenChange={() => setSelectedUpdate(null)}>
        <DialogContent className="sm:max-w-lg">
        {selectedUpdate && (() => {
            const mediaUrl = selectedUpdate.media_url;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getTypeStyles(selectedUpdate.type || "info")}`}>
                      {getTypeIcon(selectedUpdate.type || "info")}
                    </div>
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        {selectedUpdate.title}
                        {isNew(selectedUpdate.publish_at) && (
                          <Badge variant="default" className="text-xs bg-primary">
                            {t("updates.new")}
                          </Badge>
                        )}
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("updates.publishedAgo", {
                          time: formatDistanceToNow(new Date(selectedUpdate.publish_at), { addSuffix: true }),
                        })}
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="mt-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedUpdate.body}
                  </p>
                </div>

                {mediaUrl && (
                  <div className="mt-3">
                    <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg bg-muted">
                      <MediaRenderer url={mediaUrl} className="h-full object-cover" />
                    </AspectRatio>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
