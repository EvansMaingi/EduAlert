import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import studentApi, { clearStudentSession } from '../api/studentApi';
import RiskBar from '../components/RiskBar';
import { tierStyles } from '../utils/risk';

// Must match SUPPORT_TYPES in server/routes/student-portal.js.
const SUPPORT_TYPES = [
  'Remedial classes',
  'Make-up CAT',
  'Assignment extension',
  'Financial aid',
  'Academic counselling',
  'Meeting with lecturer',
  'Supplementary materials',
];

const requestStatusStyles = {
  Pending: 'bg-white/10 text-fg-2',
  Actioned: 'bg-risk-low/15 text-emerald-300',
};

const interventionStatusStyles = {
  Pending: 'bg-white/10 text-fg-2',
  Contacted: 'bg-brand-400/15 text-brand-300',
  'In Progress': 'bg-risk-medium/15 text-amber-300',
  Resolved: 'bg-risk-low/15 text-emerald-300',
};

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ styles, value }) {
  return (
    <span className={`rounded-[20px] px-[9px] py-[3px] text-[11px] font-semibold ${styles[value] || styles.Pending}`}>
      {value}
    </span>
  );
}

function RiskCard({ prediction }) {
  if (!prediction) {
    return (
      <Card title="My risk level">
        <p className="text-sm text-fg-muted">You haven't been assessed yet.</p>
      </Card>
    );
  }
  const level = prediction.risk_level;
  return (
    <Card title="My risk level">
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tierStyles[level]}`}>
          {level} risk
        </span>
        <span className="text-2xl font-semibold tabular-nums">{prediction.risk_percentage}%</span>
      </div>
      <div className="mt-4">
        <RiskBar score={prediction.risk_score} percentage={prediction.risk_percentage} width="w-full" />
      </div>
      <p className="mt-3 text-xs text-fg-muted">Assessed on {formatDate(prediction.generated_at)}</p>
    </Card>
  );
}

export default function StudentPortal() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [error, setError] = useState('');

  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError] = useState('');

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [supportNotes, setSupportNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState({ type: '', text: '' });

  const loadRequests = useCallback(async () => {
    const { data } = await studentApi.get('/api/student-portal/support-requests');
    setRequests(data);
  }, []);

  useEffect(() => {
    Promise.all([
      studentApi.get('/api/student-portal/profile'),
      studentApi.get('/api/student-portal/support-requests'),
      studentApi.get('/api/student-portal/interventions'),
    ])
      .then(([p, r, i]) => {
        setProfile(p.data);
        setRequests(r.data);
        setInterventions(i.data);
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load your portal')));
  }, []);

  function logout() {
    clearStudentSession();
    navigate('/student-login', { replace: true });
  }

  async function acknowledge() {
    setAckError('');
    setAcknowledging(true);
    try {
      const { data } = await studentApi.post('/api/student-portal/acknowledge');
      setProfile((prev) => ({
        ...prev,
        notification: { ...prev.notification, acknowledged: true, acknowledged_at: data.acknowledged_at },
      }));
    } catch (err) {
      setAckError(errorMessage(err, 'Failed to acknowledge'));
    } finally {
      setAcknowledging(false);
    }
  }

  function toggleType(type) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  // Sends one request per ticked type, all at once. Types that fail stay
  // ticked so the student can retry just those.
  async function submitRequest(e) {
    e.preventDefault();
    setRequestMessage({ type: '', text: '' });
    if (selectedTypes.length === 0) {
      setRequestMessage({ type: 'error', text: 'Please select at least one type of support.' });
      return;
    }

    setSubmitting(true);
    const types = [...selectedTypes];
    const results = await Promise.allSettled(
      types.map((type) =>
        studentApi.post('/api/student-portal/support-request', { support_type: type, notes: supportNotes })
      )
    );
    const failedTypes = types.filter((_, i) => results[i].status === 'rejected');

    if (failedTypes.length === 0) {
      setSelectedTypes([]);
      setSupportNotes('');
      setRequestMessage({ type: 'success', text: 'Your requests have been submitted' });
    } else {
      setSelectedTypes(failedTypes);
      const reason = errorMessage(results.find((r) => r.status === 'rejected').reason, 'Request failed');
      const sent = types.length - failedTypes.length;
      setRequestMessage({
        type: 'error',
        text: `${sent > 0 ? `${sent} request(s) submitted, but ` : ''}${failedTypes.join(', ')} could not be submitted: ${reason}. They are still ticked so you can try again.`,
      });
    }

    try {
      await loadRequests();
    } catch {
      // The list refreshes on the next page load; the submit result above still stands.
    }
    setSubmitting(false);
  }

  const student = profile?.student;
  const notification = profile?.notification;

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
        <span className="text-lg font-semibold text-brand-300">
          EduAlert <span className="font-normal text-fg-muted">Student Portal</span>
        </span>
        <button
          onClick={logout}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg-2 hover:bg-surface-2"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        {error && <p className="rounded-lg bg-risk-high/15 px-3 py-2 text-sm text-red-300">{error}</p>}
        {!error && !profile && <p className="text-sm text-fg-muted">Loading…</p>}

        {profile && (
          <>
            <div className="relative overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_55%,#3b82f6_100%)] p-6 text-white shadow-md">
              {profile.prediction && (
                <span className="absolute right-5 top-5 rounded-[20px] bg-surface">
                  <span
                    className={`block rounded-[20px] px-[9px] py-[3px] text-[11px] font-semibold ${tierStyles[profile.prediction.risk_level]}`}
                  >
                    {profile.prediction.risk_level} risk
                  </span>
                </span>
              )}
              <p className="text-sm text-fg-inv-2">Welcome back</p>
              <h1 className="mt-1 pr-28 text-2xl font-extrabold">{student.full_name}</h1>
              <p className="mt-1 text-sm text-fg-inv-2">
                {student.programme}
                {student.year_of_study ? ` · Year ${student.year_of_study}` : ''}
                {student.student_number ? ` · ${student.student_number}` : ''}
              </p>
            </div>

            {['High', 'Medium'].includes(profile.prediction?.risk_level) && (
              <div
                role="alert"
                className="rounded-[10px] border-l-4 border-risk-high bg-risk-high/10 px-4 py-3 text-sm text-fg-2"
              >
                <span className="font-semibold text-[#f87171]">
                  You have been flagged as {profile.prediction.risk_level} risk.
                </span>{' '}
                Review the areas that need attention below and request the support you need.
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <RiskCard prediction={profile.prediction} />

              <Card title="Areas that need attention">
                {profile.weak_areas.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-fg-2">
                    {profile.weak_areas.map((area) => (
                      <li key={area}>{area}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-fg-muted">
                    {profile.academic_record
                      ? 'None of your indicators are currently flagged. Keep it up!'
                      : 'No academic record is available yet.'}
                  </p>
                )}
              </Card>
            </div>

            {notification && (
              <Card title="Risk notification">
                <p className="text-sm text-fg-2">
                  A risk notification was sent to you on {formatDate(notification.sent_at)}.
                </p>
                {ackError && <p className="mt-3 text-sm text-red-300">{ackError}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={acknowledge}
                    disabled={notification.acknowledged || acknowledging}
                    className="rounded-lg bg-brand font-semibold shadow-[0_1px_3px_rgba(37,99,235,.3)] px-4 py-2 text-sm text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-fg-muted"
                  >
                    {acknowledging ? 'Saving…' : 'I have read and understood my risk notification'}
                  </button>
                  {notification.acknowledged && (
                    <span className="text-sm text-emerald-300">
                      ✓ Acknowledged on {formatDate(notification.acknowledged_at)}
                    </span>
                  )}
                </div>
              </Card>
            )}

            <Card title="Request support">
              <form onSubmit={submitRequest} className="space-y-4">
                {requestMessage.text && (
                  <p
                    className={`rounded-lg px-3 py-2 text-sm ${
                      requestMessage.type === 'success'
                        ? 'bg-risk-low/15 text-emerald-300'
                        : 'bg-risk-high/15 text-red-300'
                    }`}
                  >
                    {requestMessage.text}
                  </p>
                )}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-fg-2">
                    Type of support <span className="font-normal text-fg-muted">(select all that apply)</span>
                  </legend>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {SUPPORT_TYPES.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm text-fg-2">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(t)}
                          onChange={() => toggleType(t)}
                          className="h-4 w-4 accent-brand"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-fg-2">Details (optional)</span>
                  <input
                    type="text"
                    value={supportNotes}
                    onChange={(e) => setSupportNotes(e.target.value)}
                    placeholder="e.g. which unit you need help with (added to each request)"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand font-semibold shadow-[0_1px_3px_rgba(37,99,235,.3)] px-4 py-2 text-sm text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </Card>

            <Card title="My support requests">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Support type</th>
                      <th className="py-2 pr-4">Details</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-fg-muted">
                          You haven't requested any support yet.
                        </td>
                      </tr>
                    )}
                    {requests.map((r) => (
                      <tr key={r.request_id}>
                        <td className="whitespace-nowrap py-2 pr-4 text-fg-muted">{formatDate(r.requested_at)}</td>
                        <td className="py-2 pr-4 font-medium">{r.support_type}</td>
                        <td className="py-2 pr-4 text-fg-2">{r.notes || '—'}</td>
                        <td className="py-2">
                          <Badge styles={requestStatusStyles} value={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="My interventions">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Action taken by your lecturer</th>
                      <th className="py-2 pr-4">Outcome</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {interventions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-fg-muted">
                          No interventions have been logged for you.
                        </td>
                      </tr>
                    )}
                    {interventions.map((i) => (
                      <tr key={i.intervention_id}>
                        <td className="whitespace-nowrap py-2 pr-4 text-fg-muted">{formatDate(i.date_logged)}</td>
                        <td className="py-2 pr-4">{i.action_taken}</td>
                        <td className="py-2 pr-4 text-fg-2">{i.outcome || '—'}</td>
                        <td className="py-2">
                          <Badge styles={interventionStatusStyles} value={i.status || 'Pending'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
