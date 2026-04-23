import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  previousValue?: number;
  periodLabel?: string;
}

export function AdminStatsCard({ 
  title, 
  value, 
  icon: Icon,
  previousValue,
  periodLabel,
}: AdminStatsCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(value) || 0;
  const formattedValue = typeof value === "number" 
    ? value.toLocaleString() 
    : value;

  // Calculate % change
  let changePercent: number | null = null;
  let changeDirection: "up" | "down" | "flat" = "flat";
  if (previousValue !== undefined && previousValue !== null) {
    if (previousValue === 0) {
      changePercent = numericValue > 0 ? 100 : 0;
    } else {
      changePercent = Math.round(((numericValue - previousValue) / previousValue) * 100);
    }
    changeDirection = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-500 text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{formattedValue}</p>
          {changePercent !== null && (
            <div className="flex items-center gap-1.5 mt-2">
              {changeDirection === "up" && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +{changePercent}%
                </span>
              )}
              {changeDirection === "down" && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <TrendingDown className="h-3 w-3" />
                  {changePercent}%
                </span>
              )}
              {changeDirection === "flat" && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full">
                  <Minus className="h-3 w-3" />
                  0%
                </span>
              )}
              {periodLabel && (
                <span className="text-xs text-slate-400">{periodLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
          <Icon className="h-6 w-6 text-blue-500" />
        </div>
      </div>
    </div>
  );
}
