import { useEffect, useState } from 'react';
import api from '../api/axios';
import { latestPredictionByStudent, riskTier, tierStyles } from '../utils/risk';

export default function Students() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/api/students'), api.get('/api/predictions')])
      .then(([students, predictions]) => {
        const latest = latestPredictionByStudent(predictions.data);
        setRows(students.data.map((s) => ({ ...s, prediction: latest.get(s.student_id) })));
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load students'));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Students</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              )}
              {rows.map((s) => {
                const tier = riskTier(s.prediction?.risk_score);
                return (
                  <tr key={s.student_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{s.student_id}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">{s.programme}</td>
                    <td className="px-4 py-3">{s.year_of_study}</td>
                    <td className="px-4 py-3">{s.units_registered}</td>
                    <td className="px-4 py-3">
                      {s.fee_balance_outstanding != null
                        ? `KES ${Number(s.fee_balance_outstanding).toLocaleString()}`
                        : '—'}
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
