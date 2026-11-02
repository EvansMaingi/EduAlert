require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Resend } = require('resend');
const { riskLevel, weakAreas } = require('./riskInsights');

// The Resend constructor throws without a key, so only create the client when
// one is set; otherwise the server would crash on startup.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const NEXT_STEPS = [
  'Visit your academic advisor',
  'Attend all remaining classes this semester',
  'Submit all pending assignments immediately',
  'Contact your lecturer for additional support',
];

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const STUDENT_PORTAL_URL = `${CLIENT_URL}/student-login`;

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
  return Boolean(process.env.RESEND_API_KEY);
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
    throw new Error('Email is not configured (set RESEND_API_KEY in server/.env)');
  }
  if (!student.email) {
    throw new Error('Student has no email address');
  }
  if (!prediction) {
    throw new Error('Student has no prediction');
  }

  // Resend reports failures in the result instead of throwing; throw so callers
  // don't log a rejected email as sent.
  const { data, error } = await resend.emails.send({
    from: 'EduAlert <noreply@edualert.store>',
    to: student.email,
    cc: process.env.EMAIL_TEST_RECIPIENT || undefined,
    subject: 'EduAlert - Academic Risk Notification',
    html: buildHtml(student, prediction, intervention),
  });
  if (error) throw new Error(error.message);
  return data;
}

const LOGIN_URL = 'https://edu-alert-iota.vercel.app';

function buildWelcomeHtml(user, plainPassword) {
  const rows = [
    ['Name', user.name],
    ['Email', user.email],
    ['Password', plainPassword],
    ['Role', user.role === 'admin' ? 'Admin' : 'Lecturer'],
  ]
    .map(
      ([label, value]) => `<tr>
              <td style="padding:6px 16px 6px 0;color:#64748b;">${label}</td>
              <td style="padding:6px 0;font-weight:bold;">${escapeHtml(value)}</td>
            </tr>`
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="background:#1d4ed8;color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold;">EduAlert</div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;">Dear ${escapeHtml(user.name)},</p>
        <p style="margin:0 0 16px;">An EduAlert account has been created for you. Your login details are below.</p>

        <div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
          <table style="border-collapse:collapse;font-size:14px;">
            ${rows}
          </table>
        </div>

        <p style="margin:0 0 20px;">
          <a href="${LOGIN_URL}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">Log in to EduAlert</a>
        </p>
        <p style="margin:0;font-size:13px;color:#64748b;">
          Or open <a href="${LOGIN_URL}" style="color:#2563eb;">${LOGIN_URL}</a>.
          Please keep these details private.
        </p>
      </div>
      <div style="padding:16px 24px;background:#f1f5f9;font-size:12px;color:#64748b;">
        This is an automated message from EduAlert - Student Academic Welfare System
      </div>
    </div>
  </body>
</html>`;
}

// Emails a new staff user their login details. Throws if the email can't be sent.
async function sendWelcomeEmail(user, plainPassword) {
  if (!isConfigured()) {
    throw new Error('Email is not configured (set RESEND_API_KEY in server/.env)');
  }

  const { data, error } = await resend.emails.send({
    from: 'EduAlert <noreply@edualert.store>',
    to: user.email,
    subject: 'Welcome to EduAlert',
    html: buildWelcomeHtml(user, plainPassword),
  });
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { sendRiskNotification, sendWelcomeEmail, buildHtml };
