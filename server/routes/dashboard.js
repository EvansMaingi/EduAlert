const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { riskLevel } = require('../services/riskInsights');

const router = express.Router();

const YEARS = [1, 2, 3, 4];

function emptyCounts() {
  return { high: 0, medium: 0, low: 0 };
}

// GET /api/dashboard/analytics (protected, admin only)
// Built from each student's latest prediction (highest prediction_id, as the
// dashboard does), using the same High/Medium/Low tiers as the rest of the app.
// Students without a prediction are left out.
router.get('/analytics', auth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.student_id, s.full_name, s.programme, s.year_of_study,
              p.risk_score, p.risk_percentage
       FROM students s
       JOIN (
         SELECT DISTINCT ON (student_id) student_id, risk_score, risk_percentage
         FROM risk_predictions
         ORDER BY student_id, prediction_id DESC
       ) p ON p.student_id = s.student_id`
    );
    const rows = result.rows.map((r) => ({ ...r, risk_level: riskLevel(r.risk_score) }));

    const byProgramme = new Map();
    const byYear = new Map(YEARS.map((y) => [y, emptyCounts()]));
    for (const r of rows) {
      const key = r.risk_level.toLowerCase();

      const programme = r.programme || 'Not set';
      if (!byProgramme.has(programme)) byProgramme.set(programme, emptyCounts());
      byProgramme.get(programme)[key] += 1;

      const year = r.year_of_study ?? 'Not set';
      if (!byYear.has(year)) byYear.set(year, emptyCounts());
      byYear.get(year)[key] += 1;
    }

    const riskByProgramme = [...byProgramme]
      .map(([programme, counts]) => ({ programme, ...counts }))
      .sort((a, b) => a.programme.localeCompare(b.programme));
    // Years 1-4 always appear (even with no students), then any others.
    const riskByYear = [...byYear].map(([year, counts]) => ({ year, ...counts }));

    // Highest risk first, at-risk (High/Medium) students only.
    const topAtRisk = rows
      .filter((r) => r.risk_level !== 'Low')
      .sort((a, b) => b.risk_percentage - a.risk_percentage)
      .slice(0, 5)
      .map((r) => ({
        student_id: r.student_id,
        full_name: r.full_name,
        programme: r.programme,
        year_of_study: r.year_of_study,
        risk_score: r.risk_score,
        risk_percentage: r.risk_percentage,
        risk_level: r.risk_level,
      }));

    res.json({ riskByProgramme, riskByYear, topAtRisk });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard analytics' });
  }
});

module.exports = router;
