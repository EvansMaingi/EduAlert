// Risk tiers and weak-area rules shared by the notification email and the
// Student Portal, so both always tell a student the same thing.

// Thresholds below which (or above which, for late submissions) an area is
// flagged as weak. Rates are percentages (0-100).
const WEAK_AREA_RULES = [
  {
    field: 'attendance_rate',
    label: 'Class attendance',
    isWeak: (v) => v < 70,
    advice: 'below the expected 70%',
  },
  {
    field: 'cat_score_avg',
    label: 'CAT score average',
    isWeak: (v) => v < 50,
    advice: 'below 50%',
  },
  {
    field: 'assignment_submission_rate',
    label: 'Assignment submission',
    isWeak: (v) => v < 75,
    advice: 'below 75% of assignments submitted',
  },
  {
    field: 'late_submission_rate',
    label: 'Late submissions',
    isWeak: (v) => v > 30,
    advice: 'more than 30% of work submitted late',
  },
];

// Same tiers as the client (client/src/utils/risk.js).
function riskLevel(score) {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

// student: the student's fields plus their academic record's rates
//          (attendance_rate, cat_score_avg, ..., fee_balance_outstanding, prior_unit_failure)
// Returns a list of human-readable weak areas.
function weakAreas(student) {
  const areas = [];
  for (const rule of WEAK_AREA_RULES) {
    const value = student[rule.field];
    if (value != null && rule.isWeak(Number(value))) {
      areas.push(`${rule.label}: ${Number(value)}% (${rule.advice})`);
    }
  }
  if (student.fee_balance_outstanding) {
    areas.push('Outstanding fee balance, which can affect exam eligibility');
  }
  if (student.prior_unit_failure) {
    areas.push('A previously failed unit');
  }
  return areas;
}

module.exports = { riskLevel, weakAreas };
