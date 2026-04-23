import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActiveUsersChartProps {
  data: { day: number; value: number }[];
}

export function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  return (
    <div className="rounded-xl bg-sidebar p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-sidebar-foreground">Active Users</h3>
        <Select defaultValue="december">
          <SelectTrigger className="w-32 h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            <SelectItem value="january">January</SelectItem>
            <SelectItem value="february">February</SelectItem>
            <SelectItem value="march">March</SelectItem>
            <SelectItem value="april">April</SelectItem>
            <SelectItem value="may">May</SelectItem>
            <SelectItem value="june">June</SelectItem>
            <SelectItem value="july">July</SelectItem>
            <SelectItem value="august">August</SelectItem>
            <SelectItem value="september">September</SelectItem>
            <SelectItem value="october">October</SelectItem>
            <SelectItem value="november">November</SelectItem>
            <SelectItem value="december">December</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-64">
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
              tickFormatter={(value) => `${value / 1000000}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 15%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)" }}
            />
            <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-sidebar-foreground/60 text-center mt-2">Days of Months</p>
    </div>
  );
}
