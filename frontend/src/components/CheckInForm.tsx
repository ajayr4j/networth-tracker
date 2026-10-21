import { useState, type FormEvent } from "react";
import type { CreateCheckInInput } from "../api/timeline";

type CheckInFormProps = {
  onSubmit: (data: CreateCheckInInput) => Promise<void>;
};

function currentMonthValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}-01`;
}

export function CheckInForm({ onSubmit }: CheckInFormProps) {
  const [month, setMonth] = useState(currentMonthValue());
  const [notes, setNotes] = useState("");
  const [actions, setActions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ month, notes, actions });
      setNotes("");
      setActions("");
    } catch {
      setError("Could not save this check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Monthly check-in</h2>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <div className="grid gap-4">
        <label className="text-sm text-slate-700">
          Month
          <input
            type="date"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Action items
          <textarea
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {isSubmitting ? "Saving..." : "Add check-in"}
      </button>
    </form>
  );
}
