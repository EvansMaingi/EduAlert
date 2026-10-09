import { useEffect, useState } from 'react';
import api from '../api/axios';
import { latestPredictionByStudent, riskTier } from '../utils/risk';

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/students'),
      api.get('/api/predictions'),
      api.get('/api/interventions'),
    ])
      .then(([students, predictions, interventions]) => {
        const latest = [...latestPredictionByStudent(predictions.data).values()];
        setStats({
          totalStudents: students.data.length,
          highRisk: latest.filter((p) => riskTier(p.risk_score) === 'High').length,
          mediumRisk: latest.filter((p) => riskTier(p.risk_score) === 'Medium').length,
          interventions: interventions.data.length,
        });
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && !stats && <p className="text-sm text-slate-500">Loading…</p>}

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Students" value={stats.totalStudents} accent="text-slate-800" />
          <SummaryCard label="High Risk" value={stats.highRisk} accent="text-red-600" />
          <SummaryCard label="Medium Risk" value={stats.mediumRisk} accent="text-amber-600" />
          <SummaryCard label="Interventions" value={stats.interventions} accent="text-indigo-600" />
        </div>
      )}
    </div>
  );
}
