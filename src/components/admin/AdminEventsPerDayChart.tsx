import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";

interface EpisodeEventCount {
  episode: number;
  value: number;
}

export function AdminEventsPerDayChart() {
  const { t } = useTranslation();
  const { show } = useAdminShow();
  
  const { data: episodes } = useQuery({
    queryKey: ["dashboard-episodes-list", show?.id],
    queryFn: async () => {
      if (!show?.id) return [];
      const { data } = await supabase
        .from("episodes")
        .select("episode_number, is_active")
        .eq("show_id", show.id)
        .order("episode_number", { ascending: true });
      return data || [];
    },
    enabled: !!show?.id,
  });

  const currentEpisode = useMemo(() => {
    if (!episodes || episodes.length === 0) return 1;
    const activeEp = episodes.find(e => e.is_active);
    if (activeEp) return activeEp.episode_number;
    return Math.max(...episodes.map(e => e.episode_number));
  }, [episodes]);

  const [selectedEpisode, setSelectedEpisode] = useState<string>("current");
  const displayEpisode = selectedEpisode === "current" ? currentEpisode : parseInt(selectedEpisode);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["dashboard-events-per-episode", show?.id],
    queryFn: async (): Promise<EpisodeEventCount[]> => {
      if (!show?.id) return [];
      const { data: events } = await supabase
        .from("events")
        .select("episode_number")
        .eq("show_id", show.id);

      if (!events || !episodes) return [];

      const countsByEpisode: Record<number, number> = {};
      episodes.forEach(ep => { countsByEpisode[ep.episode_number] = 0; });
      events.forEach(event => {
        const epNum = event.episode_number;
        countsByEpisode[epNum] = (countsByEpisode[epNum] || 0) + 1;
      });

      return Object.entries(countsByEpisode)
        .map(([ep, count]) => ({ episode: parseInt(ep), value: count }))
        .sort((a, b) => a.episode - b.episode);
    },
    enabled: !!show?.id && !!episodes,
  });

  const chartData = useMemo(() => {
    if (!eventsData || eventsData.length === 0) return [];
    if (selectedEpisode === "all") return eventsData;
    const rangeSize = 5;
    const halfRange = Math.floor(rangeSize / 2);
    const startEp = Math.max(1, displayEpisode - halfRange);
    const endEp = startEp + rangeSize - 1;
    return eventsData.filter(d => d.episode >= startEp && d.episode <= endEp);
  }, [eventsData, selectedEpisode, displayEpisode]);

  // Compute stats
  const currentRoundEvents = eventsData?.find(d => d.episode === displayEpisode)?.value ?? 0;
  const previousRoundEvents = eventsData?.find(d => d.episode === displayEpisode - 1)?.value ?? null;
  const avgEvents = eventsData && eventsData.length > 0
    ? Math.round((eventsData.reduce((s, d) => s + d.value, 0) / eventsData.length) * 10) / 10
    : 0;

  let changePercent: number | null = null;
  let changeDirection: "up" | "down" | "flat" = "flat";
  if (previousRoundEvents !== null && selectedEpisode !== "all") {
    if (previousRoundEvents === 0) {
      changePercent = currentRoundEvents > 0 ? 100 : 0;
    } else {
      changePercent = Math.round(((currentRoundEvents - previousRoundEvents) / previousRoundEvents) * 100);
    }
    changeDirection = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  }

  const hasData = chartData.some(d => d.value > 0);
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 10) : 10;

  const episodeOptions = useMemo(() => {
    const options = [
      { value: "current", label: t('admin.currentRound', 'Current Round') },
      { value: "all", label: t('admin.allRounds', 'All Rounds') },
    ];
    if (episodes) {
      episodes.forEach(ep => {
        options.push({
          value: ep.episode_number.toString(),
          label: `${t('admin.round', 'Round')} ${ep.episode_number}`,
        });
      });
    }
    return options;
  }, [episodes, t]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-900">{t('admin.eventsPerRound', 'Events Per Round')}</h3>
        <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
          <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 text-slate-700 text-sm">
            <SelectValue placeholder={t('admin.selectRound', 'Select round')} />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 max-h-[300px]">
            {episodeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      {selectedEpisode !== "all" && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold text-slate-900">{currentRoundEvents}</span>
          {changePercent !== null && (
            <span className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
              changeDirection === "up" ? "text-emerald-600 bg-emerald-50" :
              changeDirection === "down" ? "text-red-600 bg-red-50" :
              "text-slate-500 bg-slate-50"
            }`}>
              {changeDirection === "up" && <TrendingUp className="h-3 w-3" />}
              {changeDirection === "down" && <TrendingDown className="h-3 w-3" />}
              {changeDirection === "flat" && <Minus className="h-3 w-3" />}
              {changeDirection === "up" ? "+" : ""}{changePercent}%
            </span>
          )}
          <span className="text-xs text-slate-400">
            vs {t('admin.round', 'Round')} {displayEpisode - 1}
          </span>
        </div>
      )}
      {selectedEpisode === "all" && (
        <p className="text-slate-400 text-sm mb-3">
          {t('admin.allRoundsDescription', 'Events across all rounds')}
        </p>
      )}
      
      <div className="h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p className="text-sm">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 25 }}>
              <XAxis 
                dataKey="episode" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={8}
                tickFormatter={(value) => `${value}`}
              >
                <Label value={t('admin.round', 'Round')} position="insideBottom" offset={-15} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
              </XAxis>
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={[0, maxValue + 5]}
              >
                <Label value={t('admin.events', 'Events')} position="insideTop" offset={-10} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
              </YAxis>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                labelFormatter={(label) => `${t('admin.round', 'Round')} ${label}`}
                formatter={(value: number) => [value, t('admin.events', 'Events')]}
              />
              {avgEvents > 0 && (
                <ReferenceLine
                  y={avgEvents}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `${t('admin.avg', 'Avg')}: ${avgEvents}`,
                    position: 'insideTopRight',
                    fill: '#f59e0b',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                />
              )}
              <Bar 
                dataKey="value" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Calendar className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium">{t('admin.noEventsYet', 'No events yet')}</p>
            <p className="text-xs">{t('admin.eventsWillAppear', 'Events will appear here when recorded')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
