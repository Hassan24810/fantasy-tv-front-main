import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Loader2, TrendingUp } from "lucide-react";
import { useParticipantPickCounts } from "@/hooks/useParticipantPickCounts";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminPickCountsChart() {
  const { show } = useAdminShow();
  const { t } = useTranslation();
  const { pickCounts, isLoading } = useParticipantPickCounts(show?.id);
  const [selectedEpisode, setSelectedEpisode] = useState<string>("current");

  const { data: episodes = [] } = useQuery({
    queryKey: ["admin-picks-episodes", show?.id],
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

  if (isLoading) {
    return (
      <Card className="bg-white text-slate-900 border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("admin.participantOwnership")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totalUsers = pickCounts[0]?.total_users || 0;
  const topParticipants = pickCounts.slice(0, 10);
  const avgPickPct = topParticipants.length > 0
    ? Math.round(topParticipants.reduce((s, p) => s + p.pick_percentage, 0) / topParticipants.length)
    : 0;
  const mostPicked = topParticipants[0];

  return (
    <Card className="bg-white text-slate-900 border-slate-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("admin.participantOwnership")}
          </CardTitle>
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
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-slate-500">
            {t("admin.participantOwnershipDescription", { count: totalUsers })}
          </p>
          {mostPicked && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {t('admin.avg', 'Avg')}: {avgPickPct}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {topParticipants.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">{t("admin.noTeamDataYet")}</p>
            <p className="text-xs">{t("admin.teamDataWillAppear")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topParticipants.map((participant, index) => {
              const isAboveAvg = participant.pick_percentage > avgPickPct;
              return (
                <div key={participant.participant_id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 w-6">
                    {index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.participant_photo_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {participant.participant_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {participant.participant_name}
                      </p>
                      <div className="flex items-center gap-1">
                        {isAboveAvg && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${participant.pick_percentage}%` }}
                        />
                        {/* Average marker */}
                        {avgPickPct > 0 && (
                          <div
                            className="absolute top-0 h-full w-0.5 bg-amber-400"
                            style={{ left: `${avgPickPct}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {participant.pick_percentage}% ({participant.pick_count})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
