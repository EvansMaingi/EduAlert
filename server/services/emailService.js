require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const { riskLevel, weakAreas } = require('./riskInsights');

// Gmail SMTP. EMAIL_PASS must be a Gmail App Password (requires 2FA on the
// account), not the normal account password.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Fail fast so a slow SMTP server doesn't hold up the API response.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const NEXT_STEPS = [
  'Visit your academic advisor',
  'Attend all remaining classes this semester',
  'Submit all pending assignments immediately',
  'Contact your lecturer for additional support',
];

const STUDENT_PORTAL_URL = 'http://localhost:5173/student-login';

const LEVEL_COLORS = { High: '#dc2626', Medium: '#b45309', Low: '#047857' };

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isConfigured() {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  return Boolean(
    EMAIL_USER &&
      EMAIL_PASS &&
      EMAIL_USER !== 'your_gmail@gmail.com' &&
      EMAIL_PASS !== 'your_gmail_app_password'
  );
}

function buildHtml(student, prediction, intervention = null) {
  const level = riskLevel(prediction.risk_score);
  const areas = weakAreas(student);

  const areasHtml = areas.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;">${areas
        .map((a) => `<li style="margin-bottom:4px;">${escapeHtml(a)}</li>`)
        .join('')}</ul>`
    : '<p style="margin:8px 0 0;">No specific weak areas were flagged in your latest academic record.</p>';

  const stepsHtml = NEXT_STEPS.map((s) => `<li style="margin-bottom:4px;">${escapeHtml(s)}</li>`).join('');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="background:#4f46e5;color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold;">EduAlert</div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;">Dear ${escapeHtml(student.full_name)},</p>
        <p style="margin:0 0 16px;">
          Our early warning system has identified that you may be at risk of
          academic difficulty this semester. We are reaching out early so that you have time to get back on track.
        </p>

        <div style="border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:20px;">
          <div style="font-size:13px;color:#64748b;">Risk level</div>
          <div style="font-size:22px;font-weight:bold;color:${LEVEL_COLORS[level]};">
            ${level} risk &middot; ${escapeHtml(prediction.risk_percentage)}%
          </div>
        </div>

        <h3 style="margin:0;font-size:16px;">Areas that need attention</h3>
        ${areasHtml}

${
  intervention
    ? `        <h3 style="margin:20px 0 0;font-size:16px;">Action taken by your lecturer</h3>
        <p style="margin:8px 0 0;">${escapeHtml(intervention.action_taken)}</p>
`
    : ''
}
        <h3 style="margin:20px 0 0;font-size:16px;">Recommended next steps</h3>
        <ul style="margin:8px 0 0;padding-left:20px;">${stepsHtml}</ul>

        <p style="margin:20px 0 0;padding:12px 16px;background:#eef2ff;border-radius:6px;">
          Log in to your EduAlert Student Portal at
          <a href="${STUDENT_PORTAL_URL}" style="color:#4338ca;">${STUDENT_PORTAL_URL}</a>
          to acknowledge this notification and request support.
        </p>
      </div>
      <div style="padding:16px 24px;background:#f1f5f9;font-size:12px;color:#64748b;">
        This is an automated notification from EduAlert - Student Academic Welfare System
      </div>
    </div>
  </body>
</html>`;
}

// Sends the risk notification to the student's email address.
// intervention is optional; without it the "Action taken" section is left out.
// If EMAIL_TEST_RECIPIENT is set, it is CC'd on every email so a copy goes
// there too. Throws if the email can't be sent.
async function sendRiskNotification(student, prediction, intervention = null) {
  if (!isConfigured()) {
    throw new Error('Email is not configured (set EMAIL_USER and EMAIL_PASS in server/.env)');
  }
  if (!student.email) {
    throw new Error('Student has no email address');
  }
  if (!prediction) {
    throw new Error('Student has no prediction');
  }

  return transporter.sendMail({
    from: `"EduAlert" <${process.env.EMAIL_USER}>`,
    to: student.email,
    cc: process.env.EMAIL_TEST_RECIPIENT || undefined,
    subject: 'EduAlert - Academic Risk Notification',
    html: buildHtml(student, prediction, intervention),
  });
}

module.exports = { sendRiskNotification, buildHtml };
