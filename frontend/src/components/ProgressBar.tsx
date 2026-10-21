type ProgressBarProps = {
  percentComplete: number;
};

export function ProgressBar({ percentComplete }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentComplete));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className="h-full rounded-full bg-emerald-600 transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
