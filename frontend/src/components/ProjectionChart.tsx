import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "../lib/format";
import type { Forecast } from "../api/projections";

type ProjectionChartProps = {
  forecast: Forecast;
};

type ChartRow = {
  date: string;
  conservative?: number;
  base?: number;
  optimistic?: number;
};

function mergeScenarios(forecast: Forecast): ChartRow[] {
  const { conservative, base, optimistic } = forecast.scenarios;
  const maxLength = Math.max(
    conservative.trajectory.length,
    base.trajectory.length,
    optimistic.trajectory.length,
  );

  const rows: ChartRow[] = [];
  for (let i = 0; i < maxLength; i++) {
    const date =
      conservative.trajectory[i]?.date ?? base.trajectory[i]?.date ?? optimistic.trajectory[i]?.date;
    if (!date) continue;
    rows.push({
      date,
      conservative: conservative.trajectory[i]?.net_worth,
      base: base.trajectory[i]?.net_worth,
      optimistic: optimistic.trajectory[i]?.net_worth,
    });
  }
  return rows;
}

export function ProjectionChart({ forecast }: ProjectionChartProps) {
  const data = mergeScenarios(forecast);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value: number) => formatINR(value)} tick={{ fontSize: 12 }} width={90} />
        <Tooltip formatter={(value: number) => formatINR(value)} />
        <Legend />
        <ReferenceLine
          y={forecast.target_net_worth}
          stroke="#dc2626"
          strokeDasharray="6 4"
          label={{ value: "Target", position: "insideTopLeft", fill: "#dc2626", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="conservative"
          name="Conservative"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
        <Line type="monotone" dataKey="base" name="Base" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="optimistic"
          name="Optimistic"
          stroke="#059669"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
