import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as holdingsApi from "../api/holdings";
import * as timelineApi from "../api/timeline";
import { MilestoneBadge } from "../components/MilestoneBadge";
import { NetWorthChart } from "../components/NetWorthChart";
import { ProgressBar } from "../components/ProgressBar";
import { useAuth } from "../context/AuthContext";
import { formatINR } from "../lib/format";

export function Dashboard() {
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: holdingsApi.getDashboard,
  });
  const { data: milestones } = useQuery({
    queryKey: ["milestones"],
    queryFn: timelineApi.getMilestones,
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">Signed in as {user?.email}</p>
            <Link to="/holdings" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
              Manage holdings
            </Link>
            <Link
              to="/projections"
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Projections
            </Link>
            <Link
              to="/timeline"
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Timeline
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Log out
            </button>
          </div>
        </div>

        {isLoading || !data ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm text-slate-500">Net worth</p>
              <p className="text-3xl font-semibold text-slate-900">{formatINR(data.net_worth)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Target: {formatINR(data.target_net_worth)} &middot; Remaining:{" "}
                {formatINR(data.remaining)}
              </p>
              <div className="mt-4">
                <ProgressBar percentComplete={data.percent_complete} />
                <p className="mt-1 text-right text-sm text-slate-600">
                  {data.percent_complete}% complete
                </p>
              </div>
            </div>

            {milestones && (
              <MilestoneBadge milestones={milestones} netWorth={data.net_worth} />
            )}

            <div className="rounded-lg bg-white p-6 shadow">
              <p className="mb-4 text-sm text-slate-500">Net worth over time</p>
              <NetWorthChart data={data.historical_series} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
