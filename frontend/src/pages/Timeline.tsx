import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as timelineApi from "../api/timeline";
import type { ActivityLogEntry, EventType } from "../api/timeline";
import { CheckInForm } from "../components/CheckInForm";

const EVENT_META: Record<EventType, { icon: string; label: string }> = {
  holding_created: { icon: "➕", label: "Holding added" },
  valuation_updated: { icon: "📈", label: "Valuation updated" },
  holding_archived: { icon: "🗑️", label: "Holding archived" },
  milestone_achieved: { icon: "🏁", label: "Milestone achieved" },
  checkin_created: { icon: "📝", label: "Monthly check-in" },
  partner_joined: { icon: "🤝", label: "Partner joined" },
};

function TimelineItem({ entry }: { entry: ActivityLogEntry }) {
  const meta = EVENT_META[entry.event_type];
  return (
    <li className="flex items-start gap-3 rounded bg-slate-50 px-3 py-3">
      <span aria-hidden="true" className="text-xl">
        {meta.icon}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-900">{meta.label}</p>
        <p className="text-sm text-slate-600">{entry.description}</p>
        <p className="mt-1 text-xs text-slate-400">
          {new Date(entry.created_at).toLocaleString()}
        </p>
      </div>
    </li>
  );
}

export function Timeline() {
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: timelineApi.getTimeline,
  });

  const createCheckIn = useMutation({
    mutationFn: timelineApi.createCheckIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Timeline</h1>
          <Link
            to="/dashboard"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            Back to dashboard
          </Link>
        </div>

        <CheckInForm
          onSubmit={async (data) => {
            await createCheckIn.mutateAsync(data);
          }}
        />

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Activity</h2>
          {isLoading || !entries ? (
            <p className="text-slate-500">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <TimelineItem key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
