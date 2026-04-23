import { ArrowRightLeft, Share2, Wallet } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShow } from "@/contexts/ShowContext";
import { useMemo } from "react";

type Participant = Tables<"participants">;

interface TeamMember {
  participant: Participant;
  totalPoints: number;
  gameweekPoints: number;
  isEliminated?: boolean;
}

interface B2CTeamCardProps {
  team: TeamMember[];
  onTransfer: (participant: Participant) => void;
  onShareClick?: () => void;
}

export const B2CTeamCard = ({ team, onTransfer, onShareClick }: B2CTeamCardProps) => {
  const { t } = useTranslation();
  const { settings } = useShow();
  const budgetEnabled = settings?.budget_mode_enabled ?? false;
  const budgetAmount = settings?.budget_amount ?? 0;

  const teamTotalPrice = useMemo(() => {
    if (!budgetEnabled) return 0;
    return team.reduce((sum, m) => sum + (m.participant.price ?? 0), 0);
  }, [team, budgetEnabled]);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold text-foreground">{t('dashboard.YourTeam')}</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {t('dashboard.totalPoints')}
            </span>
            <span className="flex items-center gap-1.5 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {t('dashboard.gwPoints')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          
          {onShareClick && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onShareClick}
            className="text-muted-foreground hover:text-foreground"
          >
            <Share2 className="w-4 h-4 mr-1" />
            {t('sharing.shareTeam')}
          </Button>
        )}
        </div>
      </div>
      
      {team.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('dashboard.emptyTeam')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div 
              key={member.participant.id}
              className={cn(
                "relative aspect-[3/4] rounded-[0.3rem] overflow-hidden group cursor-pointer border-2 hover:shadow-lg transition-all",
                (member.participant.gender?.toLowerCase() === "female" || member.participant.gender?.toLowerCase() === "f" || member.participant.gender?.toLowerCase() === "woman") ? "border-pink-500" : 
                (member.participant.gender?.toLowerCase() === "male" || member.participant.gender?.toLowerCase() === "m" || member.participant.gender?.toLowerCase() === "man") ? "border-blue-500" : "border-ring",
                member.isEliminated && "opacity-75"
              )}
              onClick={() => onTransfer(member.participant)}
            >
              {member.participant.photo_url ? (
                <img 
                  src={member.participant.photo_url}
                  alt={member.participant.name}
                  className={cn(
                    "w-full h-full object-cover",
                    member.isEliminated && "grayscale"
                  )}
                />
                
              ) : (
                <div className={cn(
                  "w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center",
                  member.isEliminated && "grayscale"
                )}>
                  <span className="text-3xl font-bold text-foreground">
                    {member.participant.name.charAt(0)}
                  </span>
                </div>
                
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* "UTE" (Out) Badge for eliminated/inactive */}
              {member.isEliminated && (
                <div className="absolute top-3 left-12 z-10">
                  <Badge className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                    {t('participants.out')}
                  </Badge>
                </div>
              )}

              {/* Custom status label for customized participants */}
              {!member.isEliminated && member.participant.status === "customized" && member.participant.custom_status_label && (
                <div className="absolute top-3 left-12 z-10">
                  <Badge className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                    {member.participant.custom_status_label}
                  </Badge>
                </div>
              )}

              {/* Points badges at Top Left with hover tooltips */}
              <div className="absolute top-3 left-3 z-40 flex flex-col items-start gap-1.5">
                {/* Total points badge + tooltip */}
                <div className="relative group/tp peer/tp">
                  <div className="flex items-center justify-center min-w-[28px] h-5 bg-white border border-red-500 rounded-full px-1.5 cursor-default shadow-sm">
                    <span className="text-red-500 text-[10px] font-bold leading-none">
                      {member.totalPoints}
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-0 top-6 z-50 w-48 rounded-xl p-3 shadow-2xl pointer-events-none
                                  opacity-0 group-hover/tp:opacity-100 transition-opacity duration-200"
                       style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.1)' }}>
                    <p className="text-slate-800 font-semibold text-xs leading-tight mb-1">
                      {t('dashboard.totalPoints')}
                    </p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {member.participant.bio
                        ? member.participant.bio.slice(0, 80) + (member.participant.bio.length > 80 ? '…' : '')
                        : t('dashboard.totalPointsDesc', { defaultValue: 'Total points accumulated by this participant across all episodes.' })
                      }
                    </p>
                  </div>
                </div>

                {/* Gameweek points badge + tooltip */}
                <div className="relative group/gw peer/gw">
                  <div className="flex items-center justify-center min-w-[28px] h-5 bg-white border border-green-500 rounded-full px-1.5 cursor-default shadow-sm">
                    <span className="text-green-500 text-[10px] font-bold leading-none">
                      {member.gameweekPoints}
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-0 top-6 z-50 w-48 rounded-xl p-3 shadow-2xl pointer-events-none
                                  opacity-0 group-hover/gw:opacity-100 transition-opacity duration-200"
                       style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.1)' }}>
                    <p className="text-slate-800 font-semibold text-xs leading-tight mb-1">
                      {t('dashboard.gwPoints')}
                    </p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {t('dashboard.gwPointsDesc', { defaultValue: 'Points earned by this participant in the current gameweek.' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Info (Name and Age) */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col justify-end">
                <p className="text-white font-semibold text-sm mb-0.5 line-clamp-1">
                  {member.participant.name}
                </p>
                <p className="text-xs text-white/70">
                  {member.participant.age} {t('common.years')}
                </p>
                {budgetEnabled && member.participant.price != null && (
                  <p className="text-xs text-amber-300 font-medium mt-1">
                    💰 {member.participant.price}
                  </p>
                )}
              </div>

              {/* Card Hover detail overlay */}
              <div
                className={cn(
                  "absolute inset-0 z-20 flex flex-col justify-start p-4 pt-[72px]",
                  "opacity-0 group-hover:opacity-100 transition-all duration-300",
                  "peer-hover/tp:!opacity-0 peer-hover/gw:!opacity-0", // Hide when hovering points
                  "backdrop-blur-sm rounded-[0.3rem]"
                )}
                style={{ backgroundColor: 'rgba(40, 40, 40, 0.8)' }}
              >
                <p className="text-white font-bold text-sm leading-snug line-clamp-1">
                  {member.participant.name}
                </p>
                {member.participant.age && (
                  <p className="text-white/80 text-[11px] mt-0.5">
                    {member.participant.age} {t('common.years')}
                  </p>
                )}
                {member.participant.bio && (
                  <p className="text-white/90 text-[11px] mt-3 leading-relaxed line-clamp-6">
                    {member.participant.bio}
                  </p>
                )}
              </div>

              {/* Transfer icon on hover - only if not eliminated */}
              {!member.isEliminated && (
                <div className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <ArrowRightLeft className="w-4 h-4 text-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
