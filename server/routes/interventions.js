const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['Pending', 'Contacted', 'In Progress', 'Resolved'];

// POST /api/interventions (protected)
// Status starts as 'Contacted': logging an intervention means the lecturer
// has already contacted the student.
router.post('/', auth, async (req, res) => {
  const { prediction_id, student_id, action_taken, outcome, notes } = req.body;

  if (!action_taken) {
    return res.status(400).json({ error: 'action_taken is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO interventions (prediction_id, student_id, user_id, action_taken, outcome, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Contacted')
       RETURNING *`,
      [prediction_id, student_id, req.user.user_id, action_taken, outcome, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create intervention' });
  }
});

// PATCH /api/interventions/:id/status (protected)
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;

  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid intervention id' });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE interventions SET status = $1 WHERE intervention_id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intervention not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update intervention status' });
  }
});

// GET /api/interventions (protected)
// Includes the student's full_name (null if the intervention has no student).
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, s.full_name
       FROM interventions i
       LEFT JOIN students s ON s.student_id = i.student_id
       ORDER BY i.intervention_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

module.exports = router;
