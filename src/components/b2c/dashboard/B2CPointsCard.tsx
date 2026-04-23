import { Trophy, Star, TrendingUp, Users, Share2, TrendingUp as TrendingIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface B2CPointsCardProps {
  gameweekPoints: number;
  totalPoints: number;
  rank: number;
  totalPlayers: number;
  onGameweekClick?: () => void;
  onTotalClick?: () => void;
  onRankClick?: () => void;
  onShareClick?: () => void;
}

export const B2CPointsCard = ({
  gameweekPoints,
  totalPoints,
  rank,
  totalPlayers,
  onGameweekClick,
  onTotalClick,
  onRankClick,
  onShareClick,
}: B2CPointsCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#0f172a]">{t('dashboard.yourPoints')}</h3>
        {onShareClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShareClick}
            className="text-slate-500 hover:text-slate-900"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t('sharing.shareScore')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Points Card */}
        <div
          className="relative bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group flex flex-col"
          onClick={onGameweekClick}
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-4 transition-colors group-hover:bg-blue-100">
            <Star className="w-4 h-4 text-blue-600 fill-blue-600/10" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-600 mb-6 whitespace-nowrap">{t('dashboard.Points')}</p>
          </div>
          <p className="text-3xl font-extrabold text-[#0f172a]">{gameweekPoints}</p>
        </div>

        {/* Rank Card */}
        <div
          className="relative bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group flex flex-col"
          onClick={onRankClick}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center transition-colors group-hover:bg-blue-100">
              <Trophy className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-[#10b981] font-bold text-xs">
              <span>+65%</span>
              <TrendingIcon className="w-3 h-3" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-600 mb-6 whitespace-nowrap">{t('dashboard.your Ranking')}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-[#0f172a]">#{rank}</p>
            <p className="text-xs font-medium text-slate-400">{t('dashboard.of')} {totalPlayers}</p>
          </div>
        </div>

        {/* Players Card */}
        <div
          className="relative bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group flex flex-col"
          onClick={onTotalClick}
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-4 transition-colors group-hover:bg-blue-100">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-600 mb-6 whitespace-nowrap">{t('dashboard.Players in Total')}</p>
          </div>
          <p className="text-3xl font-extrabold text-[#0f172a]">{totalPoints}</p>
        </div>
      </div>
    </div>
  );
};
