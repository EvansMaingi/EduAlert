const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// GET /api/notifications (protected, admin only)
// Newest first, with the student's full_name (null if the notification has no student).
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, s.full_name
       FROM notifications n
       LEFT JOIN students s ON s.student_id = n.student_id
       ORDER BY n.sent_at DESC, n.notification_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;
