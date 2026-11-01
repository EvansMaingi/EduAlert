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

// Badge styles (tinted background, risk-colour text and a faint border).
export const tierStyles = {
  High: 'border border-risk-high/20 bg-[#fef2f2] text-risk-high',
  Medium: 'border border-risk-medium/20 bg-[#fffbeb] text-risk-medium',
  Low: 'border border-risk-low/20 bg-[#f0fdf4] text-risk-low',
};

// Solid fills for bars. tierColors (for Recharts) and tierFillClasses (for
// Tailwind) are the same colours: --red-500, --amber-500, --green-500. Amber is
// under 3:1 contrast on white, so always show the value as text beside it.
export const tierColors = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#16a34a',
};

export const tierFillClasses = {
  High: 'bg-risk-high',
  Medium: 'bg-risk-medium',
  Low: 'bg-risk-low',
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
