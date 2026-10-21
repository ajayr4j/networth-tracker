import { useState, type FormEvent } from "react";
import type {
  CreateHoldingInput,
  HoldingCategory,
  HoldingKind,
} from "../api/holdings";
import type { Member } from "../api/workspaces";

const ASSET_CATEGORIES: { value: HoldingCategory; label: string }[] = [
  { value: "stocks", label: "Stocks" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "cash", label: "Cash" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "property", label: "Property" },
  { value: "business_equity", label: "Business Equity" },
  { value: "other", label: "Other" },
];

const LIABILITY_CATEGORIES: { value: HoldingCategory; label: string }[] = [
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
];

type HoldingFormProps = {
  members: Member[];
  onSubmit: (data: CreateHoldingInput) => Promise<void>;
};

export function HoldingForm({ members, onSubmit }: HoldingFormProps) {
  const [kind, setKind] = useState<HoldingKind>("asset");
  const [category, setCategory] = useState<HoldingCategory>("stocks");
  const [label, setLabel] = useState("");
  const [ownerType, setOwnerType] = useState<"individual" | "joint">("joint");
  const [ownerUser, setOwnerUser] = useState<number | "">("");
  const [value, setValue] = useState("");
  const [asOf, setAsOf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = kind === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  function handleKindChange(nextKind: HoldingKind) {
    setKind(nextKind);
    const nextCategories = nextKind === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
    setCategory(nextCategories[0].value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (ownerType === "individual" && !ownerUser) {
      setError("Select an owner for an individual holding.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        kind,
        category,
        label,
        owner_type: ownerType,
        owner_user: ownerType === "individual" ? Number(ownerUser) : null,
        value,
        as_of: asOf || undefined,
      });
      setLabel("");
      setValue("");
      setAsOf("");
      setOwnerType("joint");
      setOwnerUser("");
    } catch {
      setError("Could not add this holding. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Add a holding</h2>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Type
          <select
            value={kind}
            onChange={(e) => handleKindChange(e.target.value as HoldingKind)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as HoldingCategory)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Label
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Ownership
          <select
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as "individual" | "joint")}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="joint">Joint</option>
            <option value="individual">Individual</option>
          </select>
        </label>

        {ownerType === "individual" && (
          <label className="text-sm text-slate-700">
            Owner
            <select
              value={ownerUser}
              onChange={(e) => setOwnerUser(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select a partner</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name || member.email}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm text-slate-700">
          Current value (₹)
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          As of
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {isSubmitting ? "Adding..." : "Add holding"}
      </button>
    </form>
  );
}
