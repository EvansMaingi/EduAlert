import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import RiskBar from '../components/RiskBar';
import StudentDetailModal from '../components/StudentDetailModal';
import { useAuth } from '../context/AuthContext';
import { isAtRisk, latestPredictionByStudent, riskTier, tierStyles } from '../utils/risk';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [runningIds, setRunningIds] = useState(new Set());
  const [runningAll, setRunningAll] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const closeModal = useCallback(() => setSelectedId(null), []);

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
  // Lecturers only see students needing intervention, highest risk first.
  const visibleRows = !rows
    ? []
    : isAdmin
      ? rows
      : rows
          .filter((s) => s.prediction && isAtRisk(s.prediction.risk_score))
          .sort((a, b) => b.prediction.risk_score - a.prediction.risk_score);
  // Looked up from rows by ID so the modal reflects a refreshed list.
  const selectedStudent = rows?.find((s) => s.student_id === selectedId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{isAdmin ? 'Students' : 'At-Risk Students'}</h1>
          {!isAdmin && (
            <p className="mt-1 text-sm text-slate-500">
              High and Medium risk students, highest risk first
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Link
              to="/add-student"
              className="rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Add Student
            </Link>
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
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    {isAdmin ? 'No students found.' : 'No at-risk students right now.'}
                  </td>
                </tr>
              )}
              {visibleRows.map((s) => {
                const tier = riskTier(s.prediction?.risk_score);
                const hasRecord = s.record_id != null;
                const running = runningAll || runningIds.has(s.student_id);
                return (
                  <tr
                    key={s.student_id}
                    tabIndex={0}
                    aria-label={`View details for ${s.full_name}`}
                    onClick={() => setSelectedId(s.student_id)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelectedId(s.student_id);
                      }
                    }}
                    className="cursor-pointer hover:bg-slate-50 focus:bg-indigo-50 focus:outline-none"
                  >
                    <td className="px-4 py-3 text-slate-500">{s.student_id}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">{s.programme}</td>
                    <td className="px-4 py-3">{s.year_of_study}</td>
                    <td className="px-4 py-3">{s.units_registered}</td>
                    <td className="px-4 py-3">
                      {s.fee_balance_outstanding ? 'Outstanding' : 'Cleared'}
                    </td>
                    <td className="px-4 py-3">
                      {s.prediction ? (
                        <RiskBar score={s.prediction.risk_score} percentage={s.prediction.risk_percentage} />
                      ) : (
                        '—'
                      )}
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
                      {isAdmin ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runPrediction(s);
                          }}
                          disabled={!hasRecord || running || runningAll}
                          title={hasRecord ? undefined : 'No academic record for this student'}
                          className="rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {running ? 'Running…' : 'Run Prediction'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/interventions', { state: { studentId: s.student_id } });
                          }}
                          className="rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          Log Intervention
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={closeModal} />
      )}
    </div>
  );
}
