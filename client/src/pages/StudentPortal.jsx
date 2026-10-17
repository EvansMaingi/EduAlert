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
  Pending: 'bg-slate-100 text-slate-700',
  Actioned: 'bg-emerald-100 text-emerald-700',
};

const interventionStatusStyles = {
  Pending: 'bg-slate-100 text-slate-700',
  Contacted: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  Resolved: 'bg-emerald-100 text-emerald-700',
};

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ styles, value }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[value] || styles.Pending}`}>
      {value}
    </span>
  );
}

function RiskCard({ prediction }) {
  if (!prediction) {
    return (
      <Card title="My risk level">
        <p className="text-sm text-slate-500">You haven't been assessed yet.</p>
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
      <p className="mt-3 text-xs text-slate-500">Assessed on {formatDate(prediction.generated_at)}</p>
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
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <span className="text-lg font-semibold text-indigo-700">
          EduAlert <span className="font-normal text-slate-500">Student Portal</span>
        </span>
        <button
          onClick={logout}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!error && !profile && <p className="text-sm text-slate-500">Loading…</p>}

        {profile && (
          <>
            <div>
              <h1 className="text-2xl font-semibold">Welcome, {student.full_name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {student.programme}
                {student.year_of_study ? ` · Year ${student.year_of_study}` : ''}
                {student.student_number ? ` · ${student.student_number}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <RiskCard prediction={profile.prediction} />

              <Card title="Areas that need attention">
                {profile.weak_areas.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {profile.weak_areas.map((area) => (
                      <li key={area}>{area}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    {profile.academic_record
                      ? 'None of your indicators are currently flagged. Keep it up!'
                      : 'No academic record is available yet.'}
                  </p>
                )}
              </Card>
            </div>

            {notification && (
              <Card title="Risk notification">
                <p className="text-sm text-slate-700">
                  A risk notification was sent to you on {formatDate(notification.sent_at)}.
                </p>
                {ackError && <p className="mt-3 text-sm text-red-700">{ackError}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={acknowledge}
                    disabled={notification.acknowledged || acknowledging}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {acknowledging ? 'Saving…' : 'I have read and understood my risk notification'}
                  </button>
                  {notification.acknowledged && (
                    <span className="text-sm text-emerald-700">
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
                    className={`rounded-md px-3 py-2 text-sm ${
                      requestMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {requestMessage.text}
                  </p>
                )}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">
                    Type of support <span className="font-normal text-slate-500">(select all that apply)</span>
                  </legend>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {SUPPORT_TYPES.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(t)}
                          onChange={() => toggleType(t)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Details (optional)</span>
                  <input
                    type="text"
                    value={supportNotes}
                    onChange={(e) => setSupportNotes(e.target.value)}
                    placeholder="e.g. which unit you need help with (added to each request)"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </Card>

            <Card title="My support requests">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Support type</th>
                      <th className="py-2 pr-4">Details</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500">
                          You haven't requested any support yet.
                        </td>
                      </tr>
                    )}
                    {requests.map((r) => (
                      <tr key={r.request_id}>
                        <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{formatDate(r.requested_at)}</td>
                        <td className="py-2 pr-4 font-medium">{r.support_type}</td>
                        <td className="py-2 pr-4 text-slate-600">{r.notes || '—'}</td>
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
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Action taken by your lecturer</th>
                      <th className="py-2 pr-4">Outcome</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {interventions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500">
                          No interventions have been logged for you.
                        </td>
                      </tr>
                    )}
                    {interventions.map((i) => (
                      <tr key={i.intervention_id}>
                        <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{formatDate(i.date_logged)}</td>
                        <td className="py-2 pr-4">{i.action_taken}</td>
                        <td className="py-2 pr-4 text-slate-600">{i.outcome || '—'}</td>
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
