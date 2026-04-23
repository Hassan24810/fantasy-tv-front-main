import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function StatsCard({ title, value, icon: Icon, change, changeType = "positive" }: StatsCardProps) {
  return (
    <div className="rounded-xl bg-sidebar p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            {change && (
              <span
                className={`text-xs font-medium ${
                  changeType === "positive"
                    ? "text-green-400"
                    : changeType === "negative"
                    ? "text-red-400"
                    : "text-sidebar-foreground/60"
                }`}
              >
                {changeType === "positive" ? "↑" : changeType === "negative" ? "↓" : ""} {change}
              </span>
            )}
            <p className="text-xs text-sidebar-foreground/60">{title}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-sidebar-foreground">{value.toLocaleString()}</p>
    </div>
  );
}
