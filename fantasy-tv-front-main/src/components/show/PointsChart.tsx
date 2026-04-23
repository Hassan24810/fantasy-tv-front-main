import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface PointsData {
  name: string;
  gwPoints: number;
  totalPoints: number;
}

interface PointsChartProps {
  data: PointsData[];
}

export function PointsChart({ data }: PointsChartProps) {
  return (
    <div className="rounded-xl bg-sidebar p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-sidebar-foreground">Poeng Siste Spillrunde Per Deltaker</h3>
          <p className="text-xs text-sidebar-foreground/60">Lorem ipsum dolor sit amet</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-sidebar-foreground" />
            <span className="text-sidebar-foreground/60">Total Points</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sidebar-foreground/60">Spillrunde</span>
          </div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
              tickFormatter={(value) => `${value}pt`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
              tickFormatter={(value) => `${value}pt`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 15%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
            />
            <Bar yAxisId="left" dataKey="gwPoints" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="right" dataKey="totalPoints" fill="hsl(210, 40%, 98%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
