const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/students (protected)
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT student_id, full_name, programme, year_of_study, units_registered,
              fee_balance_outstanding, prior_unit_failure, created_at
       FROM students
       ORDER BY student_id`
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
