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
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, subMonths, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";

interface DataPoint {
  day: number;
  value: number;
}

interface MonthOption {
  value: string;
  label: string;
  start: Date;
  end: Date;
}

function getMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
      start: startOfMonth(date),
      end: endOfMonth(date),
    });
  }
  return options;
}

export function AdminActiveUsersChart() {
  const { t } = useTranslation();
  const { show } = useAdminShow();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  
  const selectedOption = monthOptions.find(m => m.value === selectedMonth) || monthOptions[0];
  const selectedIndex = monthOptions.findIndex(m => m.value === selectedMonth);
  const previousOption = selectedIndex < monthOptions.length - 1 ? monthOptions[selectedIndex + 1] : null;
  const daysInMonth = getDaysInMonth(selectedOption.start);

  // Current month data
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-active-users", show?.id, selectedMonth],
    queryFn: async (): Promise<DataPoint[]> => {
      if (!show?.id) return [];
      const { data: users } = await supabase
        .from("show_users")
        .select("joined_at")
        .eq("show_id", show.id)
        .gte("joined_at", selectedOption.start.toISOString())
        .lte("joined_at", selectedOption.end.toISOString());

      const countsByDay: Record<number, number> = {};
      for (let i = 1; i <= daysInMonth; i++) countsByDay[i] = 0;
      users?.forEach(user => {
        const day = new Date(user.joined_at).getDate();
        countsByDay[day] = (countsByDay[day] || 0) + 1;
      });
      return Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        value: countsByDay[i + 1] || 0,
      }));
    },
    enabled: !!show?.id,
  });

  // Previous month data for comparison
  const { data: previousData } = useQuery({
    queryKey: ["dashboard-active-users-prev", show?.id, previousOption?.value],
    queryFn: async (): Promise<number> => {
      if (!show?.id || !previousOption) return 0;
      const { count } = await supabase
        .from("show_users")
        .select("*", { count: "exact", head: true })
        .eq("show_id", show.id)
        .gte("joined_at", previousOption.start.toISOString())
        .lte("joined_at", previousOption.end.toISOString());
      return count || 0;
    },
    enabled: !!show?.id && !!previousOption,
  });

  const chartData = data || [];
  const currentTotal = chartData.reduce((sum, d) => sum + d.value, 0);
  const prevTotal = previousData ?? 0;
  const avgPerDay = chartData.length > 0 ? Math.round((currentTotal / daysInMonth) * 10) / 10 : 0;

  // % change calculation
  let changePercent: number | null = null;
  let changeDirection: "up" | "down" | "flat" = "flat";
  if (previousOption && prevTotal !== undefined) {
    if (prevTotal === 0) {
      changePercent = currentTotal > 0 ? 100 : 0;
    } else {
      changePercent = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
    }
    changeDirection = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${value / 1000000}M`;
    if (value >= 1000) return `${value / 1000}K`;
    return value.toString();
  };

  const hasData = chartData.some(d => d.value > 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-900">{t('admin.activeUsers', 'Active Users')}</h3>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200 text-slate-700">
            <SelectValue placeholder={t('admin.selectMonth', 'Select month')} />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-2xl font-bold text-slate-900">{currentTotal}</span>
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
        {previousOption && (
          <span className="text-xs text-slate-400">vs {previousOption.label}</span>
        )}
      </div>
      
      <div className="h-[250px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p className="text-sm">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 25 }}>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              >
                <Label value={t('admin.day', 'Day')} position="insideBottom" offset={-15} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
              </XAxis>
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={formatYAxis}
                dx={-10}
              >
                <Label value={t('admin.users', 'Users')} position="insideTop" offset={-10} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
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
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [formatYAxis(value), t('admin.users', 'Users')]}
              />
              {avgPerDay > 0 && (
                <ReferenceLine
                  y={avgPerDay}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `${t('admin.avg', 'Avg')}: ${avgPerDay}`,
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
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <BarChart3 className="h-12 w-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">{t('admin.noUserDataYet', 'No user data yet')}</p>
            <p className="text-xs">{t('admin.usersWillAppear', 'Users will appear here once they join')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
