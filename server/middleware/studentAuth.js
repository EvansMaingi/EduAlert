require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

// Verifies a Student Portal JWT ("Bearer <token>") and attaches the decoded
// payload (student_id, role, full_name) to req.student. Only role 'student'
// is allowed; staff tokens are rejected.
function studentAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (decoded.role !== 'student' || !decoded.student_id) {
      return res.status(403).json({ error: 'Student access required' });
    }
    req.student = decoded;
    next();
  });
}

module.exports = studentAuth;
