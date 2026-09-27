const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/interventions (protected)
router.post('/', auth, async (req, res) => {
  const { prediction_id, student_id, action_taken, outcome, notes } = req.body;

  if (!action_taken) {
    return res.status(400).json({ error: 'action_taken is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO interventions (prediction_id, student_id, user_id, action_taken, outcome, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [prediction_id, student_id, req.user.user_id, action_taken, outcome, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create intervention' });
  }
});

// GET /api/interventions (protected)
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM interventions ORDER BY intervention_id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

module.exports = router;
