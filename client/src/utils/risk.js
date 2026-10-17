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

// Badge styles (tinted background, dark text).
export const tierStyles = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};

// Solid fills for bars. tierColors (for Recharts) and tierFillClasses (for
// Tailwind) are the same colours: red-600, amber-500, emerald-600. Amber is
// under 3:1 contrast on white, so always show the value as text beside it.
export const tierColors = {
  High: '#dc2626',
  Medium: '#f59e0b',
  Low: '#059669',
};

export const tierFillClasses = {
  High: 'bg-red-600',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-600',
};

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
