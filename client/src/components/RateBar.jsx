import { rateFillClass } from '../utils/risk';

// Mini bar for a 0-100 academic rate, coloured by how healthy it is, with the
// value as text so it never relies on colour alone.
export default function RateBar({ label, value }) {
  if (value == null) return <span className="text-fg-muted">—</span>;
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="h-1.5 w-10 overflow-hidden rounded-[3px] bg-white/10"
      >
        <div className={`h-full rounded-[3px] ${rateFillClass(clamped)}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-fg-2">{Math.round(clamped)}%</span>
    </div>
  );
}
