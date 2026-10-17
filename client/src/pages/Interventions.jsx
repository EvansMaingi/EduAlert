import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { latestPredictionByStudent } from '../utils/risk';

const emptyForm = {
  student_id: '',
  prediction_id: '',
  action_taken: '',
  outcome: '',
  notes: '',
};

const STATUSES = ['Pending', 'Contacted', 'In Progress', 'Resolved'];

const statusStyles = {
  Pending: 'bg-slate-100 text-slate-700',
  Contacted: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  Resolved: 'bg-emerald-100 text-emerald-700',
};

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export default function Interventions() {
  const location = useLocation();
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Lookup of the selected student's latest prediction: idle | loading | found | none | error
  const [predictionStatus, setPredictionStatus] = useState('idle');
  // The student whose prediction lookup is current, so a slow response for a
  // previously selected student can't overwrite the field.
  const selectedStudentRef = useRef('');
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [statusError, setStatusError] = useState('');

  function setUpdating(id, updating) {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      updating ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function updateStatus(interventionId, status) {
    setStatusError('');
    setUpdating(interventionId, true);
    try {
      const { data } = await api.patch(`/api/interventions/${interventionId}/status`, { status });
      setInterventions((prev) =>
        prev.map((i) => (i.intervention_id === interventionId ? { ...i, status: data.status } : i))
      );
    } catch (err) {
      setStatusError(errorMessage(err, 'Failed to update status'));
    } finally {
      setUpdating(interventionId, false);
    }
  }

  const loadInterventions = useCallback(async () => {
    try {
      const { data } = await api.get('/api/interventions');
      setInterventions(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load interventions'));
    }
  }, []);

  useEffect(() => {
    loadInterventions();
    api
      .get('/api/students')
      .then(({ data }) => setStudents(data))
      .catch((err) => setFormError(errorMessage(err, 'Failed to load students')));
  }, [loadInterventions]);

  // "Log Intervention" on the Students page passes the student to pre-select.
  // Clear it from history afterwards so a page refresh doesn't re-select them.
  const presetStudentId = location.state?.studentId;
  useEffect(() => {
    if (presetStudentId == null) return;
    selectStudent(String(presetStudentId));
    navigate(location.pathname, { replace: true, state: null });
  }, [presetStudentId]);

  function updateField(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleStudentChange(e) {
    selectStudent(e.target.value);
  }

  async function selectStudent(studentId) {
    selectedStudentRef.current = studentId;
    setForm((prev) => ({ ...prev, student_id: studentId, prediction_id: '' }));

    if (!studentId) {
      setPredictionStatus('idle');
      return;
    }

    setPredictionStatus('loading');
    try {
      const { data } = await api.get('/api/predictions');
      if (selectedStudentRef.current !== studentId) return;
      const latest = latestPredictionByStudent(data).get(Number(studentId));
      if (latest) {
        setForm((prev) => ({ ...prev, prediction_id: String(latest.prediction_id) }));
        setPredictionStatus('found');
      } else {
        setPredictionStatus('none');
      }
    } catch {
      if (selectedStudentRef.current === studentId) setPredictionStatus('error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);
    try {
      await api.post('/api/interventions', {
        student_id: Number(form.student_id),
        prediction_id: form.prediction_id === '' ? null : Number(form.prediction_id),
        action_taken: form.action_taken.trim(),
        outcome: form.outcome.trim() || null,
        notes: form.notes.trim() || null,
      });
      setForm(emptyForm);
      selectedStudentRef.current = '';
      setPredictionStatus('idle');
      setFormSuccess('Intervention logged.');
      await loadInterventions();
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to log intervention'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Interventions</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold">Log an intervention</h2>

        {formError && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}
        {formSuccess && (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {formSuccess}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Student">
            <select
              name="student_id"
              required
              value={form.student_id}
              onChange={handleStudentChange}
              className={inputClass}
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prediction ID">
            <input
              type="number"
              name="prediction_id"
              min="1"
              value={form.prediction_id}
              onChange={updateField}
              placeholder={predictionStatus === 'loading' ? 'Looking up…' : ''}
              className={inputClass}
            />
            {predictionStatus === 'found' && (
              <span className="mt-1 block text-xs text-slate-500">
                Pre-filled with this student's latest prediction.
              </span>
            )}
            {predictionStatus === 'none' && (
              <span className="mt-1 block text-xs text-amber-700">
                No prediction found for this student - run a prediction first
              </span>
            )}
            {predictionStatus === 'error' && (
              <span className="mt-1 block text-xs text-red-700">
                Couldn't look up predictions. Enter the prediction ID manually.
              </span>
            )}
          </Field>

          <Field label="Action taken" className="md:col-span-2">
            <textarea
              name="action_taken"
              required
              rows={2}
              placeholder="e.g. Called student in for a meeting"
              value={form.action_taken}
              onChange={updateField}
              className={inputClass}
            />
          </Field>

          <Field label="Outcome" className="md:col-span-2">
            <input
              type="text"
              name="outcome"
              placeholder="e.g. Student agreed to attend remedial classes"
              value={form.outcome}
              onChange={updateField}
              className={inputClass}
            />
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={updateField}
              className={inputClass}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={submitting || predictionStatus === 'loading' || predictionStatus === 'none'}
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Log Intervention'}
        </button>
      </form>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {statusError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{statusError}</p>
      )}

      {!error && !interventions && <p className="text-sm text-slate-500">Loading…</p>}

      {interventions && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date Logged</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Action Taken</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interventions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No interventions logged yet.
                  </td>
                </tr>
              )}
              {interventions.map((i) => (
                <tr key={i.intervention_id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {i.date_logged ? new Date(i.date_logged).toLocaleDateString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{i.full_name || '—'}</td>
                  <td className="max-w-xs px-4 py-3">{i.action_taken}</td>
                  <td className="max-w-xs px-4 py-3">{i.outcome || '—'}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{i.notes || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusStyles[i.status] || statusStyles.Pending
                        }`}
                      >
                        {i.status || 'Pending'}
                      </span>
                      <select
                        aria-label={`Update status for ${i.full_name || 'intervention'}`}
                        value={i.status || 'Pending'}
                        disabled={updatingIds.has(i.intervention_id)}
                        onChange={(e) => updateStatus(i.intervention_id, e.target.value)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
