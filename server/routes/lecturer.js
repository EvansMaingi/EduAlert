const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const SUPPORT_REQUEST_STATUSES = ['Pending', 'Actioned'];

// Every route here is for lecturers and admins only.
router.use(auth, (req, res, next) => {
  if (!['lecturer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Lecturer or admin access required' });
  }
  next();
});

// GET /api/lecturer/support-requests
// All students' support requests, newest first, with the student's full_name.
router.get('/support-requests', async (req, res) => {
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

// PATCH /api/lecturer/support-requests/:id
// Accepts { status }, e.g. { status: 'Actioned' }.
router.patch('/support-requests/:id', async (req, res) => {
  const { status } = req.body;

  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid support request id' });
  }
  if (!SUPPORT_REQUEST_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${SUPPORT_REQUEST_STATUSES.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE support_requests SET status = $1 WHERE request_id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Support request not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update support request' });
  }
});

module.exports = router;
