import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Loader2 } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
  price: number | null;
}

interface SetParticipantPricesModalProps {
  showId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SetParticipantPricesModal({ showId, open, onOpenChange, onSaved }: SetParticipantPricesModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, photo_url, price")
        .eq("show_id", showId)
        .order("name");
      if (error) {
        console.error(error);
      } else {
        setParticipants(data || []);
        const map: Record<string, string> = {};
        (data || []).forEach((p) => {
          map[p.id] = p.price != null ? String(p.price) : "";
        });
        setPrices(map);
      }
      setLoading(false);
    };
    fetch();
  }, [open, showId]);

  const missingCount = participants.filter((p) => {
    const val = prices[p.id];
    return !val || parseInt(val) <= 0;
  }).length;

  const handleSave = async () => {
    if (missingCount > 0) {
      toast({
        title: t("toast.error"),
        description: t("settings.rosterSection.allParticipantsNeedPrice", "All participants must have a price greater than 0."),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updates = participants.map((p) =>
        supabase
          .from("participants")
          .update({ price: parseInt(prices[p.id]) })
          .eq("id", p.id)
      );
      const results = await Promise.all(updates);
      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        throw new Error(failed[0].error?.message);
      }

      toast({
        title: t("toast.settingsSaved"),
        description: t("settings.rosterSection.pricesSaved", "Participant prices have been saved."),
      });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("toast.error"),
        description: err.message || t("toast.pleaseTryAgain"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>{t("settings.rosterSection.setParticipantPrices", "Set Participant Prices")}</DialogTitle>
          <DialogDescription>
            {t("settings.rosterSection.setParticipantPricesDescription", "Budget mode requires all participants to have a price. Set a price for each participant below.")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 max-h-[50vh] pr-2">
            <div className="space-y-3">
              {participants.map((p) => {
                const val = prices[p.id] || "";
                const isMissing = !val || parseInt(val) <= 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${isMissing ? "border-destructive/50 bg-destructive/5" : "border-border bg-secondary/20"}`}
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      {p.photo_url && <AvatarImage src={p.photo_url} alt={p.name} />}
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {p.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={val}
                        onChange={(e) =>
                          setPrices((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="0"
                        className="w-24 h-9 text-right"
                      />
                      {isMissing ? (
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {!loading && missingCount > 0 && (
          <p className="text-sm text-destructive">
            {t("settings.rosterSection.missingPricesCount", "{{count}} participant(s) still need a price.", { count: missingCount })}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || missingCount > 0}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t("common.saveAll", "Save All")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
