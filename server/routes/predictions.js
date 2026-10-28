const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { runPrediction, PredictionError, FEATURE_FIELDS } = require('../services/predictionService');

const router = express.Router();

// POST /api/predictions/predict (protected)
// See runPrediction in services/predictionService.js for the steps. Responds
// 201 with the saved prediction plus email_sent (and warning if any).
router.post('/predict', auth, async (req, res) => {
  const { student_id, record_id, semester, academic_year, result_label } = req.body;
  const features = {};
  for (const field of FEATURE_FIELDS) {
    features[field] = req.body[field];
  }

  try {
    const result = await runPrediction({ student_id, record_id, features, semester, academic_year, result_label });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof PredictionError) {
      return res.status(err.status).json(err.body);
    }
    console.error(err);
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
