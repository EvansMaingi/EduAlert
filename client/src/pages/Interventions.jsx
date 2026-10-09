import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Interventions() {
  const [interventions, setInterventions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/interventions')
      .then(({ data }) => setInterventions(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load interventions'));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Interventions</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && !interventions && <p className="text-sm text-slate-500">Loading…</p>}

      {interventions && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Prediction ID</th>
                <th className="px-4 py-3">Action Taken</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Notes</th>
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
                <tr key={i.intervention_id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {i.date_logged ? new Date(i.date_logged).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">{i.student_id ?? '—'}</td>
                  <td className="px-4 py-3">{i.prediction_id ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{i.action_taken}</td>
                  <td className="px-4 py-3">{i.outcome || '—'}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{i.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
