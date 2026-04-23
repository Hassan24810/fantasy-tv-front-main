import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ParticipantData {
  name: string;
  value: number;
  avatar?: string | null;
}

interface AdminEventsPerParticipantChartProps {
  data: ParticipantData[];
}

export function AdminEventsPerParticipantChart({ 
  data = [] 
}: AdminEventsPerParticipantChartProps) {
  const { t } = useTranslation();
  const hasData = data.length > 0;
  const maxValue = hasData ? Math.max(...data.map(d => d.value)) : 1;
  const totalEvents = data.reduce((s, d) => s + d.value, 0);
  const avgEvents = hasData ? Math.round((totalEvents / data.length) * 10) / 10 : 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-900">{t('admin.eventsPerParticipant', 'Events Per Participant')}</h3>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-slate-400 text-sm">{t('admin.topByEventCount', 'Top by event count')}</p>
        {hasData && (
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
            {t('admin.avg', 'Avg')}: {avgEvents}
          </span>
        )}
      </div>
      
      {hasData ? (
        <div className="space-y-4">
          {data.slice(0, 4).map((item) => {
            const isAboveAvg = item.value > avgEvents;
            return (
              <div key={item.name} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border-2 border-slate-100">
                  <AvatarImage src={item.avatar || undefined} />
                  <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-medium">
                    {item.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-slate-500">{item.value}</span>
                      {isAboveAvg && (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(item.value / maxValue) * 100}%` }}
                    />
                    {/* Average marker */}
                    {avgEvents > 0 && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-amber-400"
                        style={{ left: `${(avgEvents / maxValue) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-[180px] flex flex-col items-center justify-center text-slate-400">
          <Users className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm font-medium">{t('admin.noParticipantEventsYet', 'No participant events yet')}</p>
          <p className="text-xs">{t('admin.dataWillAppearWhenRecorded', 'Data will appear when events are recorded')}</p>
        </div>
      )}
    </div>
  );
}
