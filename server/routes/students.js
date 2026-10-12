const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/students (protected)
// Each student includes the features from their latest academic_records row
// (null if they have none), so the client can request a prediction.
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.student_id, s.full_name, s.programme, s.year_of_study, s.units_registered,
              s.fee_balance_outstanding, s.prior_unit_failure, s.created_at,
              r.record_id, r.attendance_rate, r.cat_score_avg, r.assignment_submission_rate,
              r.late_submission_rate, r.semester, r.academic_year
       FROM students s
       LEFT JOIN LATERAL (
         SELECT * FROM academic_records ar
         WHERE ar.student_id = s.student_id
         ORDER BY ar.record_id DESC
         LIMIT 1
       ) r ON true
       ORDER BY s.student_id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/:id (protected)
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT student_id, full_name, programme, year_of_study, units_registered,
              fee_balance_outstanding, prior_unit_failure, created_at
       FROM students
       WHERE student_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

module.exports = router;
