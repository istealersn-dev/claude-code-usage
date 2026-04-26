import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UsageData } from "@/lib/data";

interface UsageChartProps {
  data: UsageData[];
  color?: string;
}

export function UsageChart({ data, color = "#ffd60a" }: UsageChartProps) {
  return (
    <div className="flex flex-col gap-1 h-full">
      {/* Custom legend outside Recharts so it doesn't escape the container */}
      <div className="flex items-center gap-3 px-1">
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          Output
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-[#4a7fa5]" />
          Input
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4a7fa5" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#4a7fa5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.7} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#001d3d",
                borderColor: "#003566",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#fff" }}
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }}
              formatter={(value: number | undefined, name: string | undefined): [string | number, string] => [
                value !== undefined && value >= 1000 ? `${Math.round(value / 1000)}k` : (value ?? 0),
                name ?? "",
              ]}
            />
            <Area
              type="monotone"
              dataKey="inputTokens"
              name="Input"
              stroke="#4a7fa5"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorInput)"
            />
            <Area
              type="monotone"
              dataKey="outputTokens"
              name="Output"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOutput)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
