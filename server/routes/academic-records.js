const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const RATE_FIELDS = [
  'attendance_rate',
  'cat_score_avg',
  'assignment_submission_rate',
  'late_submission_rate',
];

// POST /api/academic-records (protected, admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
  const { student_id, semester, academic_year, result_label } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }
  for (const field of RATE_FIELDS) {
    const value = req.body[field];
    if (typeof value !== 'number' || value < 0 || value > 100) {
      return res.status(400).json({ error: `${field} must be a number between 0 and 100` });
    }
  }

  try {
    const student = await pool.query('SELECT 1 FROM students WHERE student_id = $1', [student_id]);
    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const result = await pool.query(
      `INSERT INTO academic_records
        (student_id, attendance_rate, cat_score_avg, assignment_submission_rate, late_submission_rate,
         semester, academic_year, result_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        student_id,
        req.body.attendance_rate,
        req.body.cat_score_avg,
        req.body.assignment_submission_rate,
        req.body.late_submission_rate,
        semester,
        academic_year,
        result_label,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create academic record' });
  }
});

module.exports = router;
