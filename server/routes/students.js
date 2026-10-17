const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Student Portal password given to every new student.
const DEFAULT_STUDENT_PASSWORD = 'student123';

// POST /api/students (protected, admin only)
// Sets the default Student Portal password (DEFAULT_STUDENT_PASSWORD).
router.post('/', auth, requireAdmin, async (req, res) => {
  const {
    full_name,
    email,
    student_number,
    programme,
    year_of_study,
    units_registered,
    fee_balance_outstanding,
    prior_unit_failure,
  } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'full_name is required' });
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  const normalizedStudentNumber =
    typeof student_number === 'string' && student_number.trim() ? student_number.trim() : null;

  try {
    const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);
    const result = await pool.query(
      `INSERT INTO students
        (full_name, email, student_number, programme, year_of_study, units_registered,
         fee_balance_outstanding, prior_unit_failure, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING student_id, full_name, email, student_number, programme, year_of_study, units_registered,
                 fee_balance_outstanding, prior_unit_failure, created_at`,
      [
        full_name.trim(),
        normalizedEmail,
        normalizedStudentNumber,
        programme,
        year_of_study,
        units_registered,
        Boolean(fee_balance_outstanding),
        Boolean(prior_unit_failure),
        passwordHash,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      // unique_violation on students.email or students.student_number
      const field = err.constraint === 'students_student_number_key' ? 'student number' : 'email';
      return res.status(409).json({ error: `A student with that ${field} already exists` });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

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

// DELETE /api/students/:id (protected, admin only)
// Deletes the student and everything that references them, children first so
// no foreign key is violated, in one transaction so it's all-or-nothing.
// Rows are also matched through the student's predictions/records, in case an
// intervention or notification was linked to them under another student_id.
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid student id' });
  }
  const studentId = req.params.id;
  const predictionIds = 'SELECT prediction_id FROM risk_predictions WHERE student_id = $1';
  const recordIds = 'SELECT record_id FROM academic_records WHERE student_id = $1';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM notifications WHERE student_id = $1 OR prediction_id IN (${predictionIds})`,
      [studentId]
    );
    await client.query(
      `DELETE FROM interventions WHERE student_id = $1 OR prediction_id IN (${predictionIds})`,
      [studentId]
    );
    // A prediction may reference this student's record but another student
    // (shouldn't happen, but the schema allows it); clear anything pointing at it first.
    const otherPredictions = `SELECT prediction_id FROM risk_predictions WHERE record_id IN (${recordIds})`;
    await client.query(`DELETE FROM notifications WHERE prediction_id IN (${otherPredictions})`, [studentId]);
    await client.query(`DELETE FROM interventions WHERE prediction_id IN (${otherPredictions})`, [studentId]);
    await client.query(
      `DELETE FROM risk_predictions WHERE student_id = $1 OR record_id IN (${recordIds})`,
      [studentId]
    );
    await client.query('DELETE FROM academic_records WHERE student_id = $1', [studentId]);
    await client.query('DELETE FROM support_requests WHERE student_id = $1', [studentId]);
    const result = await client.query(
      'DELETE FROM students WHERE student_id = $1 RETURNING student_id, full_name',
      [studentId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }

    await client.query('COMMIT');
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to delete student' });
  } finally {
    client.release();
  }
});

module.exports = router;
