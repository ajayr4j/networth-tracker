import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "../lib/format";
import type { HistoricalPoint } from "../api/holdings";

type NetWorthChartProps = {
  data: HistoricalPoint[];
};

export function NetWorthChart({ data }: NetWorthChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No historical data yet. Add a holding to start tracking net worth over time.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value: number) => formatINR(value)} tick={{ fontSize: 12 }} width={90} />
        <Tooltip formatter={(value) => formatINR(Array.isArray(value) ? Number(value[0]) : Number(value ?? 0))} />
        <Line
          type="monotone"
          dataKey="net_worth"
          stroke="#059669"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
