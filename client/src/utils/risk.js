// The ML service only returns a binary label ("At Risk" / "Safe"), so the
// High / Medium / Low tiers shown in the UI are derived from risk_score.
export const HIGH_RISK_THRESHOLD = 0.7;
export const MEDIUM_RISK_THRESHOLD = 0.4;

export function riskTier(score) {
  if (score == null) return null;
  if (score >= HIGH_RISK_THRESHOLD) return 'High';
  if (score >= MEDIUM_RISK_THRESHOLD) return 'Medium';
  return 'Low';
}

export const TIERS = ['High', 'Medium', 'Low'];

// Badge styles (tinted background and a faint border). The text is a lighter
// step of each colour, because the pure risk colours are under 4.5:1 at this size.
export const tierStyles = {
  High: 'border border-risk-high/30 bg-risk-high/15 text-[#f87171]',
  Medium: 'border border-risk-medium/30 bg-risk-medium/15 text-[#fbbf24]',
  Low: 'border border-risk-low/30 bg-risk-low/15 text-[#4ade80]',
};

// The same text colours, for a risk value shown without a badge.
export const tierTextClasses = {
  High: 'text-[#f87171]',
  Medium: 'text-[#fbbf24]',
  Low: 'text-[#4ade80]',
};

// Solid fills for bars. tierColors (for Recharts) and tierFillClasses (for
// Tailwind) are the same colours. Green is deeper than --green-500, which is too
// close to amber for colour-blind readers when the two are drawn as bars.
export const tierColors = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#16a34a',
};

export const tierFillClasses = {
  High: 'bg-risk-high',
  Medium: 'bg-risk-medium',
  Low: 'bg-[#16a34a]',
};

// Fill for a 0-100 academic rate where higher is better: red below 50, amber
// from 50 to 70, green above 70.
export function rateFillClass(value) {
  if (value < 50) return 'bg-risk-high';
  if (value <= 70) return 'bg-risk-medium';
  return tierFillClasses.Low;
}

// Students lecturers need to act on: High or Medium tier.
export function isAtRisk(score) {
  const tier = riskTier(score);
  return tier === 'High' || tier === 'Medium';
}

// GET /api/predictions is ordered newest first, so the first prediction seen
// for each student is their latest one.
export function latestPredictionByStudent(predictions) {
  const latest = new Map();
  for (const p of predictions) {
    if (!latest.has(p.student_id)) latest.set(p.student_id, p);
  }
  return latest;
}
