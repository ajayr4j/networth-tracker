import type { Milestone } from "../api/timeline";
import { formatINR } from "../lib/format";

type MilestoneBadgeProps = {
  milestones: Milestone[];
  netWorth: number | string;
};

export function MilestoneBadge({ milestones, netWorth }: MilestoneBadgeProps) {
  const next = milestones.find((m) => !m.achieved);

  if (!next) {
    return (
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-slate-500">All milestones achieved</p>
      </div>
    );
  }

  const current = typeof netWorth === "string" ? Number(netWorth) : netWorth;
  const remaining = Math.max(next.amount - current, 0);

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-slate-500">Next milestone</p>
      <p className="text-xl font-semibold text-slate-900">{next.label}</p>
      <p className="mt-1 text-sm text-slate-600">{formatINR(remaining)} to go</p>
    </div>
  );
}
