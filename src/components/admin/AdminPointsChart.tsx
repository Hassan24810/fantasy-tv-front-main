import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Label,
} from "recharts";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PointsData {
  name: string;
  gwPoints: number;
  totalPoints: number;
  avatar?: string | null;
}

export function AdminPointsChart() {
  const { show } = useAdminShow();
  const { t } = useTranslation();
  const [selectedEpisode, setSelectedEpisode] = useState<string>("current");

  const { data: episodes = [] } = useQuery({
    queryKey: ["admin-points-episodes", show?.id],
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
    const activeEpisode = episodes.find((ep) => ep.is_active);
    if (activeEpisode) return activeEpisode.episode_number;
    return episodes.reduce((max, ep) => Math.max(max, ep.episode_number), 0) || 1;
  }, [episodes]);

  const displayEpisode =
    selectedEpisode === "current"
      ? currentEpisode
      : selectedEpisode === "all"
        ? null
        : parseInt(selectedEpisode);

  const { data: userPoints = [], isLoading } = useQuery({
    queryKey: ["admin-points-chart", show?.id, displayEpisode],
    queryFn: async (): Promise<PointsData[]> => {
      if (!show?.id) return [];

      const { data: showUsers, error: usersError } = await supabase
        .from("show_users")
        .select("user_id, username, avatar_url")
        .eq("show_id", show.id);

      if (usersError || !showUsers) return [];

      const results: PointsData[] = [];

      for (const user of showUsers) {
        const { data: teamMembers } = await supabase
          .from("user_teams")
          .select("participant_id, added_episode, removed_episode")
          .eq("show_id", show.id)
          .eq("user_id", user.user_id);

        if (!teamMembers) continue;
        const teamParticipantIds = teamMembers.map((tm) => tm.participant_id);
        if (teamParticipantIds.length === 0) continue;

        const { data: allEventParticipants } = await supabase
          .from("event_participants")
          .select(`participant_id, points_awarded, events!inner (episode_number, show_id)`)
          .eq("events.show_id", show.id)
          .in("participant_id", teamParticipantIds);

        if (!allEventParticipants) continue;

        let gwPoints = 0;
        let totalPoints = 0;

        for (const ep of allEventParticipants) {
          const event = ep.events as unknown as { episode_number: number; show_id: string };
          const episodeNum = event.episode_number;
          const teamMember = teamMembers.find((tm) => tm.participant_id === ep.participant_id);
          if (!teamMember) continue;
          const addedEp = teamMember.added_episode ?? 1;
          const removedEp = teamMember.removed_episode ?? 9999;
          if (episodeNum < addedEp || episodeNum >= removedEp) continue;

          if (displayEpisode === null) {
            totalPoints += ep.points_awarded;
            if (episodeNum === currentEpisode) gwPoints += ep.points_awarded;
          } else {
            if (episodeNum === displayEpisode) gwPoints += ep.points_awarded;
            if (episodeNum <= displayEpisode) totalPoints += ep.points_awarded;
          }
        }

        if (gwPoints > 0 || totalPoints > 0) {
          results.push({ name: user.username, gwPoints, totalPoints, avatar: user.avatar_url });
        }
      }

      return results.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);
    },
    enabled: !!show?.id,
  });

  const hasData = userPoints.length > 0;
  const avgTotal = hasData ? Math.round(userPoints.reduce((s, u) => s + u.totalPoints, 0) / userPoints.length) : 0;
  const avgGw = hasData ? Math.round(userPoints.reduce((s, u) => s + u.gwPoints, 0) / userPoints.length) : 0;
  const topScore = hasData ? userPoints[0].totalPoints : 0;

  const episodeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: "current", label: t("admin.currentRound") },
      { value: "all", label: t("admin.allRounds") },
    ];
    episodes.forEach((ep) => {
      options.push({
        value: String(ep.episode_number),
        label: `${t("admin.round")} ${ep.episode_number}`,
      });
    });
    return options;
  }, [episodes, t]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-900">{t("admin.userPointsTitle")}</h3>
        <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
          <SelectTrigger className="w-[160px] h-8 text-sm bg-white border-slate-200">
            <SelectValue placeholder={t("admin.selectRound")} />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {episodeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      {hasData && (
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t('admin.topScore', 'Top')}:</span>
            <span className="text-sm font-semibold text-slate-900">{topScore}pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t('admin.avg', 'Avg')}:</span>
            <span className="text-sm font-semibold text-slate-700">{avgTotal}pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t('admin.roundAvg', 'Round avg')}:</span>
            <span className="text-sm font-semibold text-slate-700">{avgGw}pt</span>
          </div>
        </div>
      )}
      {!hasData && !isLoading && (
        <p className="text-slate-400 text-sm mb-4">{t("admin.userPointsDescription")}</p>
      )}

      <div className="h-[280px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <span className="text-sm">{t("common.loading")}</span>
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userPoints} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                dy={10}
              >
                <Label value={t('admin.player', 'Player')} position="insideBottom" offset={-15} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
              </XAxis>
              <YAxis
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) => `${value}pt`}
              >
                <Label value={t('admin.roundPoints', 'Round Pts')} position="insideTop" offset={-10} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
              </YAxis>
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) => `${value}pt`}
              >
                <Label value={t('admin.totalPoints', 'Total Pts')} position="insideTop" offset={-10} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
              </YAxis>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                  padding: "12px 16px",
                }}
                formatter={(value: number, name: string) => [
                  `${value}pt`,
                  name === "gwPoints" ? t("admin.roundPoints") : t("admin.totalPoints"),
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value) => (
                  <span className="text-slate-600 text-sm">
                    {value === "gwPoints" ? t("admin.roundPoints") : t("admin.totalPoints")}
                  </span>
                )}
              />
              {avgTotal > 0 && (
                <ReferenceLine
                  yAxisId="right"
                  y={avgTotal}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `${t('admin.avg', 'Avg')}: ${avgTotal}pt`,
                    position: 'insideTopRight',
                    fill: '#f59e0b',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                />
              )}
              <Bar yAxisId="left" dataKey="gwPoints" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar yAxisId="right" dataKey="totalPoints" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Trophy className="h-12 w-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">{t("admin.noUserPointsYet")}</p>
            <p className="text-xs">{t("admin.userPointsWillAppear")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
