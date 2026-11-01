import { riskTier, tierFillClasses } from '../utils/risk';

// Horizontal bar showing a prediction's risk percentage, coloured by tier,
// with the percentage as text so the value never relies on colour alone.
export default function RiskBar({ score, percentage, width = 'w-24' }) {
  const tier = riskTier(score);
  const clamped = Math.min(100, Math.max(0, Number(percentage) || 0));

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label="Risk"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className={`h-1.5 ${width} overflow-hidden rounded-[3px] bg-line`}
      >
        <div
          className={`h-full rounded-[3px] ${tierFillClasses[tier]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-fg-2">{percentage}%</span>
    </div>
  );
}
