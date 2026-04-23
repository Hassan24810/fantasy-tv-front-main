import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const defaultData = [
  { day: "Mon", value: 2 },
  { day: "Tue", value: 8 },
  { day: "Wed", value: 12 },
  { day: "Thr", value: 6 },
  { day: "Fri", value: 15 },
  { day: "Sat", value: 18 },
  { day: "Sun", value: 10 },
];

interface EventsPerDayChartProps {
  data?: { day: string; value: number }[];
}

export function EventsPerDayChart({ data = defaultData }: EventsPerDayChartProps) {
  return (
    <div className="rounded-xl bg-sidebar p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-sidebar-foreground">No of Events Per Day</h3>
          <p className="text-xs text-sidebar-foreground/60">Lorem ipsum dolor sit amet</p>
        </div>
        <Select defaultValue="weekly">
          <SelectTrigger className="w-24 h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 15%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
            />
            <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
