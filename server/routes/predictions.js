const express = require('express');
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// The 8 input features the ML service's StudentFeatures schema expects, in order.
const FEATURE_FIELDS = [
  'attendance_rate',
  'cat_score_avg',
  'assignment_submission_rate',
  'late_submission_rate',
  'fee_balance_outstanding',
  'prior_unit_failure',
  'year_of_study',
  'units_registered',
];

// POST /api/predictions/predict (protected)
// 1. Logs the 8 features as a new academic_records row.
// 2. Sends those features to the ML service.
// 3. Logs the ML service's response as a new risk_predictions row, linked to
//    both the student and the academic_records row it was computed from.
router.post('/predict', auth, async (req, res) => {
  const { student_id, semester, academic_year, result_label } = req.body;
  const features = {};
  for (const field of FEATURE_FIELDS) {
    features[field] = req.body[field];
  }

  try {
    const record = await pool.query(
      `INSERT INTO academic_records
        (student_id, attendance_rate, cat_score_avg, assignment_submission_rate, late_submission_rate,
         semester, academic_year, result_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING record_id`,
      [
        student_id,
        features.attendance_rate,
        features.cat_score_avg,
        features.assignment_submission_rate,
        features.late_submission_rate,
        semester,
        academic_year,
        result_label,
      ]
    );
    const { record_id } = record.rows[0];

    const { data: prediction } = await axios.post(`${ML_SERVICE_URL}/predict`, features);

    const result = await pool.query(
      `INSERT INTO risk_predictions
        (student_id, record_id, risk_score, risk_label, risk_percentage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_id, record_id, prediction.risk_score, prediction.risk_label, prediction.risk_percentage]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.response) {
      // Error from the ML service itself
      return res.status(err.response.status).json({ error: 'ML service error', detail: err.response.data });
    }
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// GET /api/predictions (protected)
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM risk_predictions ORDER BY prediction_id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

module.exports = router;
