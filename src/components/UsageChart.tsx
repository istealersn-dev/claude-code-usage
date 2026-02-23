import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { UsageData } from "@/lib/data";

interface UsageChartProps {
  data: UsageData[];
}

export function UsageChart({ data }: UsageChartProps) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#003566" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#003566" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#001d3d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#001d3d" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffd60a" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ffd60a" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
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
            tickFormatter={(value) => `${value / 1000}k`}
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
          />
          <Legend 
            wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
            iconType="circle"
            iconSize={8}
          />
          <Area 
            type="monotone" 
            dataKey="inputTokens" 
            name="Input" 
            stroke="#003566" 
            fillOpacity={1} 
            fill="url(#colorInput)" 
            stackId="1"
          />
          <Area 
            type="monotone" 
            dataKey="cacheTokens" 
            name="Cache" 
            stroke="#001d3d" 
            fillOpacity={1} 
            fill="url(#colorCache)" 
            stackId="1"
          />
          <Area 
            type="monotone" 
            dataKey="outputTokens" 
            name="Output" 
            stroke="#ffd60a" 
            fillOpacity={1} 
            fill="url(#colorOutput)" 
            stackId="1"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
