const express = require('express');
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendRiskNotification } = require('../services/emailService');

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// The label the ML service returns for a predicted failure (see ml-service/main.py).
const AT_RISK_LABEL = 'At Risk';

// Emails the student about their prediction. The weak-areas breakdown uses
// the features this prediction was computed from.
// Returns { recipient } on success, or { error } with a reason if the email wasn't sent.
async function notifyStudent(prediction, features) {
  try {
    const result = await pool.query(
      `SELECT student_id, full_name, email, fee_balance_outstanding, prior_unit_failure
       FROM students
       WHERE student_id = $1`,
      [prediction.student_id]
    );
    const student = result.rows[0];
    if (!student) return { error: 'student not found' };

    await sendRiskNotification(
      {
        ...student,
        attendance_rate: features.attendance_rate,
        cat_score_avg: features.cat_score_avg,
        assignment_submission_rate: features.assignment_submission_rate,
        late_submission_rate: features.late_submission_rate,
      },
      prediction
    );
    return { recipient: student.email };
  } catch (err) {
    console.error('Risk notification email failed:', err.message);
    return { error: err.message };
  }
}

// Records a sent email in the notifications table. Returns false if the insert
// fails (the email has already gone, so the caller only reports a warning).
async function logNotification(prediction, recipient) {
  try {
    await pool.query(
      `INSERT INTO notifications (student_id, prediction_id, message, email_sent, email_recipient)
       VALUES ($1, $2, $3, true, $4)`,
      [
        prediction.student_id,
        prediction.prediction_id,
        `Risk notification email sent to student. Risk level: ${prediction.risk_label} - ${prediction.risk_percentage}%`,
        recipient,
      ]
    );
    return true;
  } catch (err) {
    console.error('Failed to log notification:', err.message);
    return false;
  }
}

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
// 1. If no record_id is given, logs the 8 features as a new academic_records row;
//    otherwise reuses the existing record_id.
// 2. Sends those features to the ML service.
// 3. Logs the ML service's response as a new risk_predictions row, linked to
//    both the student and the academic_records row it was computed from.
// 4. If this is the student's first "At Risk" prediction, emails them. An email
//    failure doesn't fail the request: the response has email_sent: false and a warning.
router.post('/predict', auth, async (req, res) => {
  const { student_id, semester, academic_year, result_label } = req.body;
  const features = {};
  for (const field of FEATURE_FIELDS) {
    features[field] = req.body[field];
  }

  let saved;
  try {
    let record_id = req.body.record_id;

    if (record_id == null) {
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
      record_id = record.rows[0].record_id;
    }

    const { data: prediction } = await axios.post(`${ML_SERVICE_URL}/predict`, features);

    const result = await pool.query(
      `INSERT INTO risk_predictions
        (student_id, record_id, risk_score, risk_label, risk_percentage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_id, record_id, prediction.risk_score, prediction.risk_label, prediction.risk_percentage]
    );
    saved = result.rows[0];
  } catch (err) {
    console.error(err);
    if (err.response) {
      // Error from the ML service itself
      return res.status(err.response.status).json({ error: 'ML service error', detail: err.response.data });
    }
    return res.status(500).json({ error: 'Prediction failed' });
  }

  // Kept outside the try above: Nodemailer errors also have a .response
  // property, which would be mistaken for an ML service error.
  if (saved.risk_label !== AT_RISK_LABEL) {
    return res.status(201).json({ ...saved, email_sent: false });
  }

  // Only email the first time a student is flagged. Comparing prediction_id
  // (not just excluding this row) means that if two predictions for the same
  // student run at once, only the earlier one sends the email.
  try {
    const previous = await pool.query(
      `SELECT 1 FROM risk_predictions
       WHERE student_id = $1 AND risk_label = $2 AND prediction_id < $3
       LIMIT 1`,
      [saved.student_id, AT_RISK_LABEL, saved.prediction_id]
    );
    if (previous.rows.length > 0) {
      return res.status(201).json({ ...saved, email_sent: false });
    }
  } catch (err) {
    console.error('Previous At Risk check failed:', err.message);
    return res.status(201).json({
      ...saved,
      email_sent: false,
      warning: 'Prediction saved but email notification was skipped: could not check previous predictions',
    });
  }

  const { error: emailError, recipient } = await notifyStudent(saved, features);
  if (emailError) {
    return res.status(201).json({
      ...saved,
      email_sent: false,
      warning: `Prediction saved but email notification failed: ${emailError}`,
    });
  }

  if (!(await logNotification(saved, recipient))) {
    return res.status(201).json({
      ...saved,
      email_sent: true,
      warning: 'Email sent, but it could not be recorded in the notification log',
    });
  }
  res.status(201).json({ ...saved, email_sent: true });
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
