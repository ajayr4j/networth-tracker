import { useState, type FormEvent } from "react";
import type { ProjectionSettings, UpdateProjectionSettingsInput } from "../api/projections";

type ProjectionFormProps = {
  settings: ProjectionSettings;
  onSubmit: (data: UpdateProjectionSettingsInput) => Promise<void>;
};

export function ProjectionForm({ settings, onSubmit }: ProjectionFormProps) {
  const [monthlyContribution, setMonthlyContribution] = useState(settings.monthly_contribution);
  const [conservativeRate, setConservativeRate] = useState(settings.conservative_rate);
  const [baseRate, setBaseRate] = useState(settings.base_rate);
  const [optimisticRate, setOptimisticRate] = useState(settings.optimistic_rate);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        monthly_contribution: monthlyContribution,
        conservative_rate: conservativeRate,
        base_rate: baseRate,
        optimistic_rate: optimisticRate,
      });
    } catch {
      setError("Could not save projection settings. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Projection inputs</h2>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Monthly contribution (₹)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Conservative annual return (%)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={conservativeRate}
            onChange={(e) => setConservativeRate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Base annual return (%)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Optimistic annual return (%)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={optimisticRate}
            onChange={(e) => setOptimisticRate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {isSubmitting ? "Saving..." : "Save and recalculate"}
      </button>
    </form>
  );
}
