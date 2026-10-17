const express = require('express');
const pool = require('../db');
const studentAuth = require('../middleware/studentAuth');
const { riskLevel, weakAreas } = require('../services/riskInsights');

const router = express.Router();

// Every route here acts only on the logged-in student (req.student.student_id
// from their token), never on an id from the request.
router.use(studentAuth);

const SUPPORT_TYPES = [
  'Remedial classes',
  'Make-up CAT',
  'Assignment extension',
  'Financial aid',
  'Academic counselling',
  'Meeting with lecturer',
  'Supplementary materials',
];

// GET /api/student-portal/profile
// The student's details, latest academic record, latest prediction (with risk
// level and weak areas) and the acknowledgement status of their latest notification.
router.get('/profile', async (req, res) => {
  const studentId = req.student.student_id;

  try {
    const [studentResult, recordResult, predictionResult, notificationResult] = await Promise.all([
      pool.query(
        `SELECT student_id, full_name, email, student_number, programme, year_of_study,
                units_registered, fee_balance_outstanding, prior_unit_failure
         FROM students WHERE student_id = $1`,
        [studentId]
      ),
      pool.query(
        `SELECT record_id, attendance_rate, cat_score_avg, assignment_submission_rate,
                late_submission_rate, semester, academic_year, recorded_at
         FROM academic_records WHERE student_id = $1
         ORDER BY record_id DESC LIMIT 1`,
        [studentId]
      ),
      pool.query(
        `SELECT prediction_id, risk_score, risk_label, risk_percentage, generated_at
         FROM risk_predictions WHERE student_id = $1
         ORDER BY prediction_id DESC LIMIT 1`,
        [studentId]
      ),
      pool.query(
        `SELECT notification_id, message, sent_at, acknowledged_at
         FROM notifications WHERE student_id = $1
         ORDER BY notification_id DESC LIMIT 1`,
        [studentId]
      ),
    ]);

    const student = studentResult.rows[0];
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const record = recordResult.rows[0] || null;
    const prediction = predictionResult.rows[0] || null;
    const notification = notificationResult.rows[0] || null;

    res.json({
      student,
      academic_record: record,
      prediction: prediction && { ...prediction, risk_level: riskLevel(prediction.risk_score) },
      weak_areas: record ? weakAreas({ ...student, ...record }) : [],
      notification: notification && {
        ...notification,
        acknowledged: notification.acknowledged_at != null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// POST /api/student-portal/acknowledge
// Marks the student's latest notification as acknowledged.
router.post('/acknowledge', async (req, res) => {
  try {
    const latest = await pool.query(
      `SELECT notification_id, acknowledged_at FROM notifications
       WHERE student_id = $1
       ORDER BY notification_id DESC LIMIT 1`,
      [req.student.student_id]
    );
    const notification = latest.rows[0];
    if (!notification) {
      return res.status(404).json({ error: 'You have no notification to acknowledge' });
    }
    if (notification.acknowledged_at) {
      return res.json({ ...notification, acknowledged: true });
    }

    const result = await pool.query(
      `UPDATE notifications SET acknowledged_at = NOW()
       WHERE notification_id = $1
       RETURNING notification_id, acknowledged_at`,
      [notification.notification_id]
    );
    res.json({ ...result.rows[0], acknowledged: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge notification' });
  }
});

// POST /api/student-portal/support-request
router.post('/support-request', async (req, res) => {
  const { support_type, notes } = req.body;

  if (!SUPPORT_TYPES.includes(support_type)) {
    return res.status(400).json({ error: `support_type must be one of: ${SUPPORT_TYPES.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO support_requests (student_id, support_type, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.student.student_id, support_type, typeof notes === 'string' && notes.trim() ? notes.trim() : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit support request' });
  }
});

// GET /api/student-portal/support-requests
router.get('/support-requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT request_id, support_type, status, notes, requested_at
       FROM support_requests WHERE student_id = $1
       ORDER BY requested_at DESC, request_id DESC`,
      [req.student.student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
});

// GET /api/student-portal/interventions
// Lecturers' internal notes are deliberately not included.
router.get('/interventions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT intervention_id, action_taken, outcome, status, date_logged
       FROM interventions WHERE student_id = $1
       ORDER BY date_logged DESC, intervention_id DESC`,
      [req.student.student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

module.exports = { router, SUPPORT_TYPES };
