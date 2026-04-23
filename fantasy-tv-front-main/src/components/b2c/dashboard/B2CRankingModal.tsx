import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface RankingEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
}

interface B2CRankingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId: string | undefined;
  currentUserId: string | undefined;
  userRank: number;
  totalPlayers: number;
}

export const B2CRankingModal = ({
  open,
  onOpenChange,
  showId,
  currentUserId,
  userRank,
  totalPlayers,
}: B2CRankingModalProps) => {
  const { t } = useTranslation();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!showId || !open) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_show_global_ranking", {
          p_show_id: showId,
        });
        
        if (error) throw error;
        
        if (data && Array.isArray(data)) {
          setRankings(data as RankingEntry[]);
        }
      } catch (err) {
        console.error("Failed to fetch rankings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [showId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="w-5 h-5 text-amber-500" />
            {t('ranking.leaderboard')}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
          <p className="text-sm text-muted-foreground">{t('ranking.yourPosition')}</p>
          <p className="text-2xl font-bold text-primary">
            #{userRank} <span className="text-sm font-normal text-muted-foreground">{t('common.of')} {totalPlayers}</span>
          </p>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('ranking.noPlayers')}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {rankings.map((entry) => {
                const isCurrentUser = entry.user_id === currentUserId;
                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isCurrentUser
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      entry.rank === 1 && "bg-amber-100 text-amber-700",
                      entry.rank === 2 && "bg-slate-200 text-slate-700",
                      entry.rank === 3 && "bg-orange-100 text-orange-700",
                      entry.rank > 3 && "bg-muted text-muted-foreground"
                    )}>
                      {entry.rank}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.avatar_url || undefined} alt={entry.username} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {entry.username?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        isCurrentUser ? "text-primary" : "text-foreground"
                      )}>
                        {entry.username}
                        {isCurrentUser && <span className="ml-1 text-xs">{t('ranking.you')}</span>}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-foreground">{entry.total_points}</p>
                      <p className="text-xs text-muted-foreground">{t('points.pts')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
