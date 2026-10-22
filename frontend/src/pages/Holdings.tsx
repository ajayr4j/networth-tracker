import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import * as holdingsApi from "../api/holdings";
import type { Holding } from "../api/holdings";
import { HoldingForm } from "../components/HoldingForm";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatINR } from "../lib/format";

function canEdit(holding: Holding, userId: number | undefined): boolean {
  if (holding.owner_type === "joint") {
    return true;
  }
  return holding.owner_user === userId;
}

function HoldingRow({ holding, canEdit: editable }: { holding: Holding; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [asOf, setAsOf] = useState("");

  const updateValue = useMutation({
    mutationFn: () => holdingsApi.updateHoldingValue(holding.id, { value, as_of: asOf || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setValue("");
      setAsOf("");
    },
  });

  const archive = useMutation({
    mutationFn: () => holdingsApi.archiveHolding(holding.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function handleUpdateValue(event: FormEvent) {
    event.preventDefault();
    if (!value) return;
    updateValue.mutate();
  }

  return (
    <li className="rounded-lg bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{holding.label}</p>
          <p className="text-xs uppercase text-slate-500">
            {holding.kind} &middot; {holding.category.replace("_", " ")} &middot;{" "}
            {holding.owner_type === "joint" ? "Joint" : holding.owner_email ?? "Individual"}
          </p>
        </div>
        <p className="text-lg font-semibold text-slate-900">
          {holding.current_value !== null ? formatINR(holding.current_value) : "—"}
        </p>
      </div>

      {editable ? (
        <form onSubmit={handleUpdateValue} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-600">
            New value
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            As of
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={updateValue.isPending}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Update value
          </button>
          <button
            type="button"
            onClick={() => archive.mutate()}
            disabled={archive.isPending}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
          >
            Archive
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs italic text-slate-400">Read-only — owned by your partner.</p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-slate-500">Valuation history</summary>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {holding.valuations.map((v) => (
            <li key={v.id}>
              {v.as_of}: {formatINR(v.value)}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function Holdings() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: holdings, isLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: holdingsApi.listHoldings,
  });

  const createHolding = useMutation({
    mutationFn: holdingsApi.createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const members = workspace?.members ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Holdings</h1>

        <HoldingForm
          members={members}
          onSubmit={async (data) => {
            await createHolding.mutateAsync(data);
          }}
        />

        {isLoading ? (
          <p className="text-slate-500">Loading holdings...</p>
        ) : holdings && holdings.length > 0 ? (
          <ul className="space-y-3">
            {holdings.map((holding) => (
              <HoldingRow key={holding.id} holding={holding} canEdit={canEdit(holding, user?.id)} />
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No holdings yet. Add your first one above.</p>
        )}
      </div>
    </main>
  );
}
