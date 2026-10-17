const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/lecturer/support-requests (protected: lecturers and admins)
// All students' support requests, newest first, with the student's full_name.
router.get('/support-requests', auth, async (req, res) => {
  if (!['lecturer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Lecturer or admin access required' });
  }

  try {
    const result = await pool.query(
      `SELECT r.*, s.full_name
       FROM support_requests r
       LEFT JOIN students s ON s.student_id = r.student_id
       ORDER BY r.requested_at DESC, r.request_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
});

module.exports = router;
