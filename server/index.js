require('dotenv').config();

// Tokens signed with a missing secret are worthless, so refuse to start.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to server/.env or the host environment.');
}
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const predictionsRoutes = require('./routes/predictions');
const interventionsRoutes = require('./routes/interventions');
const academicRecordsRoutes = require('./routes/academic-records');
const notificationsRoutes = require('./routes/notifications');
const { router: studentPortalRoutes } = require('./routes/student-portal');
const lecturerRoutes = require('./routes/lecturer');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/interventions', interventionsRoutes);
app.use('/api/academic-records', academicRecordsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', require('./routes/users'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`EduAlert server listening on port ${PORT}`);
});
