import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { latestPredictionByStudent, riskTier, tierStyles } from '../utils/risk';

// Builds the POST /api/predictions/predict body from a student row, which
// carries the features of the student's latest academic record.
function predictionPayload(s) {
  return {
    student_id: s.student_id,
    // Reuse the existing record so the server doesn't insert a duplicate.
    record_id: s.record_id,
    semester: s.semester,
    academic_year: s.academic_year,
    attendance_rate: s.attendance_rate,
    cat_score_avg: s.cat_score_avg,
    assignment_submission_rate: s.assignment_submission_rate,
    late_submission_rate: s.late_submission_rate,
    // Booleans in the database; the ML service expects 0/1.
    fee_balance_outstanding: s.fee_balance_outstanding ? 1 : 0,
    prior_unit_failure: s.prior_unit_failure ? 1 : 0,
    year_of_study: s.year_of_study,
    units_registered: s.units_registered,
  };
}

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

export default function Students() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [runningIds, setRunningIds] = useState(new Set());
  const [runningAll, setRunningAll] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const [students, predictions] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/predictions'),
      ]);
      const latest = latestPredictionByStudent(predictions.data);
      setRows(students.data.map((s) => ({ ...s, prediction: latest.get(s.student_id) })));
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load students'));
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function setRunning(id, running) {
    setRunningIds((prev) => {
      const next = new Set(prev);
      running ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function runPrediction(student) {
    setNotice('');
    setRunning(student.student_id, true);
    try {
      await api.post('/api/predictions/predict', predictionPayload(student));
      await loadStudents();
    } catch (err) {
      setNotice(`${student.full_name}: ${errorMessage(err, 'Prediction failed')}`);
    } finally {
      setRunning(student.student_id, false);
    }
  }

  async function runAllPredictions() {
    const eligible = rows.filter((s) => s.record_id != null);
    if (eligible.length === 0) return;

    setNotice('');
    setRunningAll(true);
    const results = await Promise.allSettled(
      eligible.map((s) => api.post('/api/predictions/predict', predictionPayload(s)))
    );
    await loadStudents();
    setRunningAll(false);

    const failed = results.filter((r) => r.status === 'rejected').length;
    const skipped = rows.length - eligible.length;
    const parts = [`Ran ${eligible.length - failed} of ${eligible.length} predictions.`];
    if (failed) parts.push(`${failed} failed: ${errorMessage(results.find((r) => r.status === 'rejected').reason, 'Prediction failed')}.`);
    if (skipped) parts.push(`${skipped} skipped (no academic record).`);
    setNotice(parts.join(' '));
  }

  const busy = runningAll || runningIds.size > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Students</h1>
        {rows && rows.length > 0 && (
          <button
            onClick={runAllPredictions}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {runningAll ? 'Running predictions…' : 'Run All Predictions'}
          </button>
        )}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {notice && (
        <p className="mb-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{notice}</p>
      )}

      {!error && !rows && <p className="text-sm text-slate-500">Loading…</p>}

      {rows && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Fee Balance</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              )}
              {rows.map((s) => {
                const tier = riskTier(s.prediction?.risk_score);
                const hasRecord = s.record_id != null;
                const running = runningAll || runningIds.has(s.student_id);
                return (
                  <tr key={s.student_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{s.student_id}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">{s.programme}</td>
                    <td className="px-4 py-3">{s.year_of_study}</td>
                    <td className="px-4 py-3">{s.units_registered}</td>
                    <td className="px-4 py-3">
                      {s.fee_balance_outstanding ? 'Outstanding' : 'Cleared'}
                    </td>
                    <td className="px-4 py-3">
                      {s.prediction ? `${s.prediction.risk_percentage}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tier ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tierStyles[tier]}`}>
                          {tier}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not assessed</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => runPrediction(s)}
                        disabled={!hasRecord || running || runningAll}
                        title={hasRecord ? undefined : 'No academic record for this student'}
                        className="rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {running ? 'Running…' : 'Run Prediction'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
