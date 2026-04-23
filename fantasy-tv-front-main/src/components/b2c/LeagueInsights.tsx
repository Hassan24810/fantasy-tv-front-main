import { TrendingUp, TrendingDown, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OverviewInsights, LeagueInsights as LeagueInsightsType, InsightsData } from "@/hooks/useLeagueInsights";

interface LeagueInsightsComponentProps {
  mode: "overview" | "league";
  data: InsightsData | null;
  isLoading: boolean;
}

interface ParticipantRowProps {
  name: string;
  photoUrl: string | null;
  mainValue: string;
  subValue: string;
  leagueStyle?: boolean;
}

const ParticipantRow = ({ name, photoUrl, mainValue, subValue, leagueStyle = false }: ParticipantRowProps) => (
  <div
    className={
      leagueStyle
        ? "mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 last:mb-0"
        : "flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
    }
  >
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={photoUrl || undefined} alt={name} />
        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
          {name?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-slate-800 truncate">{name}</span>
    </div>
    <div className="text-right flex-shrink-0 ml-3">
      <div className="text-sm font-semibold text-slate-900">{mainValue}</div>
      <div className="text-xs text-slate-500">{subValue}</div>
    </div>
  </div>
);

const InsightCard = ({
  title,
  icon: Icon,
  iconColor,
  children,
  isEmpty,
  leagueStyle = false,
}: {
  title: string;
  icon?: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  leagueStyle?: boolean;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div className={`px-4 py-3 ${leagueStyle ? "" : "border-b border-slate-100"} flex items-center gap-2`}>
      {Icon ? <Icon className={`h-4 w-4 ${iconColor}`} /> : null}
      <h3 className={`${leagueStyle ? "text-lg md:text-2xl font-extrabold text-slate-900" : "text-sm font-semibold text-slate-800"}`}>{title}</h3>
    </div>
    <div className={`px-4 ${leagueStyle ? "pb-4" : "py-2"}`}>
      {isEmpty ? (
        <p className="text-sm text-slate-400 py-4 text-center">No data yet</p>
      ) : (
        children
      )}
    </div>
  </div>
);

export const LeagueInsights = ({ mode, data, isLoading }: LeagueInsightsComponentProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;

  const isOverview = mode === "overview";
  const subtitle = isOverview
    ? `Based on your leagues (${(data as OverviewInsights).league_count} leagues, ${(data as OverviewInsights).unique_member_count} unique members)`
    : `Based on this league (${(data as LeagueInsightsType).league_member_count} members)`;

  const mostOwned = data.most_owned || [];
  const mostIn = data.most_transferred_in || [];
  const mostOut = data.most_transferred_out || [];

  // Only show if user is in at least one league (for overview) or has data
  if (isOverview && (data as OverviewInsights).league_count === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {isOverview ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your League Insights</h2>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Transferred In */}
        <InsightCard
          title="Most Transferred In"
          icon={isOverview ? TrendingUp : undefined}
          iconColor="text-green-600"
          isEmpty={mostIn.length === 0}
          leagueStyle={!isOverview}
        >
          {mostIn.slice(0, 6).map((p) => (
            <ParticipantRow
              key={p.participant_id}
              name={p.name}
              photoUrl={p.photo_url}
              mainValue={isOverview ? `${p.transfer_count} times` : `No of times transferred: ${p.transfer_count}`}
              subValue={isOverview ? `Last 3 GWs: ${p.last_gw_points} pts` : `Total Points (Last 3 GWs): ${p.last_gw_points}`}
              leagueStyle={!isOverview}
            />
          ))}
        </InsightCard>

        {/* Most Transferred Out */}
        <InsightCard
          title="Most Transferred Out"
          icon={isOverview ? TrendingDown : undefined}
          iconColor="text-red-500"
          isEmpty={mostOut.length === 0}
          leagueStyle={!isOverview}
        >
          {mostOut.slice(0, 6).map((p) => (
            <ParticipantRow
              key={p.participant_id}
              name={p.name}
              photoUrl={p.photo_url}
              mainValue={isOverview ? `${p.transfer_count} times` : `No of times transferred out: ${p.transfer_count}`}
              subValue={isOverview ? `Last 3 GWs: ${p.last_gw_points} pts` : ""}
              leagueStyle={!isOverview}
            />
          ))}
        </InsightCard>
      </div>

      {/* Most Owned - Full width */}
      <InsightCard
        title="Most Owned Participant"
        icon={isOverview ? Users : undefined}
        iconColor="text-primary"
        isEmpty={mostOwned.length === 0}
        leagueStyle={!isOverview}
      >
        <div className={isOverview ? "grid grid-cols-1 md:grid-cols-2 gap-x-6" : "space-y-0"}>
          {mostOwned.slice(0, 6).map((p) => (
            <ParticipantRow
              key={p.participant_id}
              name={p.name}
              photoUrl={p.photo_url}
              mainValue={`${p.owned_pct}% (${p.owned_count}/${p.pool_size})`}
              subValue={isOverview ? `Last 3 GWs: ${p.last_gw_points} pts` : ""}
              leagueStyle={!isOverview}
            />
          ))}
        </div>
      </InsightCard>
    </div>
  );
};
