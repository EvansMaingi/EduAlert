const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();

const ROLES = ['admin', 'lecturer'];
const MIN_PASSWORD_LENGTH = 8;

// Every route here is admin only.
router.use(auth, requireAdmin);

// GET /api/users
// All staff accounts, newest first. Password hashes are never returned.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id AS id, full_name AS name, email, role, created_at
       FROM users
       ORDER BY created_at DESC, user_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
// Creates a staff account and emails the new user their login details. The
// account is kept even if the email fails; email_sent tells the caller.
router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or lecturer' });
  }

  let user;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id AS id, full_name AS name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash, role]
    );
    user = result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to create user' });
  }

  let emailError = null;
  try {
    await sendWelcomeEmail(user, password);
  } catch (err) {
    console.error('Welcome email failed:', err.message);
    emailError = err.message;
  }

  res.status(201).json({ ...user, email_sent: !emailError, email_error: emailError });
});

// DELETE /api/users/:id
// Admins can't delete their own account. Users who have logged interventions
// are kept so that history isn't lost.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (id === req.user.user_id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ deleted: id });
  } catch (err) {
    if (err.code === '23503') {
      return res
        .status(409)
        .json({ error: 'This user has logged interventions and cannot be deleted' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
