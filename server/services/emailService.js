require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

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

// Thresholds below which (or above which, for late submissions) an area is
// flagged as weak in the email. Rates are percentages (0-100).
const WEAK_AREA_RULES = [
  {
    field: 'attendance_rate',
    label: 'Class attendance',
    isWeak: (v) => v < 70,
    advice: 'below the expected 70%',
  },
  {
    field: 'cat_score_avg',
    label: 'CAT score average',
    isWeak: (v) => v < 50,
    advice: 'below 50%',
  },
  {
    field: 'assignment_submission_rate',
    label: 'Assignment submission',
    isWeak: (v) => v < 75,
    advice: 'below 75% of assignments submitted',
  },
  {
    field: 'late_submission_rate',
    label: 'Late submissions',
    isWeak: (v) => v > 30,
    advice: 'more than 30% of work submitted late',
  },
];

const NEXT_STEPS = [
  'Visit your academic advisor',
  'Attend all remaining classes this semester',
  'Submit all pending assignments immediately',
  'Contact your lecturer for additional support',
];

// Same tiers as the client (client/src/utils/risk.js).
function riskLevel(score) {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

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

// student: row from students joined with their latest academic record
//          (full_name, email, attendance_rate, cat_score_avg, ...,
//           fee_balance_outstanding, prior_unit_failure)
// prediction: latest risk_predictions row (risk_score, risk_percentage)
function weakAreas(student) {
  const areas = [];
  for (const rule of WEAK_AREA_RULES) {
    const value = student[rule.field];
    if (value != null && rule.isWeak(Number(value))) {
      areas.push(`${rule.label}: ${Number(value)}% (${rule.advice})`);
    }
  }
  if (student.fee_balance_outstanding) {
    areas.push('Outstanding fee balance, which can affect exam eligibility');
  }
  if (student.prior_unit_failure) {
    areas.push('A previously failed unit');
  }
  return areas;
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
// If EMAIL_TEST_RECIPIENT is set, every email goes there instead (for testing
// without emailing real students). Throws if the email can't be sent.
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

  const testRecipient = process.env.EMAIL_TEST_RECIPIENT;
  const subject = 'EduAlert - Academic Risk Notification';

  return transporter.sendMail({
    from: `"EduAlert" <${process.env.EMAIL_USER}>`,
    to: testRecipient || student.email,
    subject: testRecipient ? `[TEST - for ${student.email}] ${subject}` : subject,
    html: buildHtml(student, prediction, intervention),
  });
}

module.exports = { sendRiskNotification, buildHtml };
