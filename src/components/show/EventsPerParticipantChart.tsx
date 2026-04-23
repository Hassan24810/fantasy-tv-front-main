import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface ParticipantData {
  name: string;
  value: number;
  avatar?: string;
}

interface EventsPerParticipantChartProps {
  data: ParticipantData[];
}

export function EventsPerParticipantChart({ data }: EventsPerParticipantChartProps) {
  return (
    <div className="rounded-xl bg-sidebar p-5 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-sidebar-foreground">No of Events Per Participant</h3>
        <p className="text-xs text-sidebar-foreground/60">Lorem ipsum dolor sit amet</p>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 40, bottom: 5 }}>
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 15%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
            />
            <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill="hsl(217, 91%, 60%)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
