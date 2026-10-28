import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import RiskBar from '../components/RiskBar';
import { useAuth } from '../context/AuthContext';
import {
  isAtRisk,
  latestPredictionByStudent,
  riskTier,
  TIERS,
  tierColors,
  tierStyles,
} from '../utils/risk';

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function DistributionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, count, tier } = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: tierColors[tier] }} />
        <span className="font-medium text-slate-800">{label}</span>
      </div>
      <p className="mt-0.5 text-slate-600">
        {count} {count === 1 ? 'student' : 'students'}
      </p>
    </div>
  );
}

function RiskDistributionChart({ distribution, notAssessed }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Risk distribution</h2>
      <p className="mb-4 text-sm text-slate-500">
        Students by their latest prediction
        {notAssessed > 0 && ` · ${notAssessed} not yet assessed`}
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 24, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#475569', fontSize: 13 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip content={<DistributionTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="count" maxBarSize={72} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {distribution.map((d) => (
                <Cell key={d.tier} fill={tierColors[d.tier]} />
              ))}
              <LabelList dataKey="count" position="top" fill="#334155" fontSize={13} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Series for the grouped charts: one bar per risk level, in TIERS order, with
// the same colours as the Risk Distribution chart.
const GROUPED_SERIES = TIERS.map((tier) => ({
  tier,
  dataKey: tier.toLowerCase(),
  name: `${tier} Risk`,
}));

function GroupedTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-slate-800">{payload[0].payload.fullLabel}</p>
      {GROUPED_SERIES.map(({ tier, dataKey, name }) => {
        const count = payload[0].payload[dataKey];
        return (
          <div key={tier} className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: tierColors[tier] }} />
            <span>
              {name}: {count} {count === 1 ? 'student' : 'students'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegend() {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      {GROUPED_SERIES.map(({ tier, name }) => (
        <span key={tier} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: tierColors[tier] }} />
          {name}
        </span>
      ))}
    </div>
  );
}

// Grouped bar chart: for each category (programme or year), a High, Medium and
// Low bar. Same container and axis styling as RiskDistributionChart.
function GroupedRiskChart({ title, subtitle, data, categoryKey, formatCategory = (v) => v }) {
  // category: the axis label; fullLabel: shown in the tooltip (the unshortened name).
  const chartData = data.map((d) => {
    const raw = d[categoryKey];
    return { ...d, category: formatCategory(raw), fullLabel: typeof raw === 'string' ? raw : formatCategory(raw) };
  });
  const hasData = data.some((d) => d.high + d.medium + d.low > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {hasData ? (
        <>
          <ChartLegend />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 24, right: 8, bottom: 0, left: -16 }}
                barGap={2}
                barCategoryGap="20%"
              >
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 13 }}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip content={<GroupedTooltip />} cursor={{ fill: '#f1f5f9' }} />
                {GROUPED_SERIES.map(({ tier, dataKey, name }) => (
                  <Bar
                    key={tier}
                    dataKey={dataKey}
                    name={name}
                    fill={tierColors[tier]}
                    maxBarSize={40}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey={dataKey}
                      position="top"
                      fill="#334155"
                      fontSize={12}
                      fontWeight={600}
                      formatter={(v) => (v > 0 ? v : '')}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">No assessed students yet.</p>
      )}
    </div>
  );
}

function TopAtRiskList({ students }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Top 5 At-Risk Students</h2>
      <p className="mb-4 text-sm text-slate-500">Highest risk scores requiring immediate attention</p>
      {students.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No at-risk students right now.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {students.map((s, i) => (
            <li key={s.student_id}>
              <button
                type="button"
                onClick={() => navigate('/students')}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-2 py-3 text-left hover:bg-slate-50 focus:bg-indigo-50 focus:outline-none"
              >
                <span className="w-5 text-sm font-semibold tabular-nums text-slate-400">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-800">{s.full_name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {s.programme || '—'}
                    {s.year_of_study ? ` · Year ${s.year_of_study}` : ''}
                  </span>
                </span>
                <RiskBar score={s.risk_score} percentage={s.risk_percentage} />
                <span
                  className={`w-16 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${tierStyles[s.risk_level]}`}
                >
                  {s.risk_level}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AnalyticsSections({ analytics, error }) {
  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }
  if (!analytics) {
    return <p className="text-sm text-slate-500">Loading analytics…</p>;
  }
  return (
    <>
      <GroupedRiskChart
        title="Risk by Programme"
        subtitle="Students by programme and risk level"
        data={analytics.riskByProgramme}
        categoryKey="programme"
        // "BSc Information Technology" → "Information Technology" so axis labels fit; the tooltip shows the full name.
        formatCategory={(p) => p.replace(/^BSc\s+/, '')}
      />
      <GroupedRiskChart
        title="Risk by Year of Study"
        subtitle="Students by year and risk level"
        data={analytics.riskByYear}
        categoryKey="year"
        formatCategory={(y) => (typeof y === 'number' ? `Year ${y}` : y)}
      />
      <TopAtRiskList students={analytics.topAtRisk} />
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    // Admin-only analytics load alongside the dashboard data; a failure here
    // only affects the analytics sections, not the cards or the existing chart.
    if (isAdmin) {
      api
        .get('/api/dashboard/analytics')
        .then(({ data }) => setAnalytics(data))
        .catch((err) => setAnalyticsError(err.response?.data?.error || 'Failed to load analytics'));
    }

    Promise.all([
      api.get('/api/students'),
      api.get('/api/predictions'),
      api.get('/api/interventions'),
    ])
      .then(([students, predictions, interventions]) => {
        const latestByStudent = latestPredictionByStudent(predictions.data);
        const latest = [...latestByStudent.values()];
        const counts = { High: 0, Medium: 0, Low: 0 };
        for (const p of latest) counts[riskTier(p.risk_score)] += 1;

        const atRiskStudents = students.data
          .map((s) => ({ ...s, prediction: latestByStudent.get(s.student_id) }))
          .filter((s) => s.prediction && isAtRisk(s.prediction.risk_score))
          .sort((a, b) => b.prediction.risk_score - a.prediction.risk_score);

        setStats({
          totalStudents: students.data.length,
          counts,
          notAssessed: Math.max(0, students.data.length - latest.length),
          interventions: interventions.data.length,
          myInterventions: interventions.data.filter((i) => i.user_id === user?.user_id).length,
          atRiskStudents,
        });
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }, [user?.user_id, isAdmin]);

  const distribution = stats
    ? TIERS.map((tier) => ({ tier, label: `${tier} Risk`, count: stats.counts[tier] }))
    : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && !stats && <p className="text-sm text-slate-500">Loading…</p>}

      {stats && isAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Students" value={stats.totalStudents} accent="text-slate-800" />
            <SummaryCard label="High Risk" value={stats.counts.High} accent="text-red-600" />
            <SummaryCard label="Medium Risk" value={stats.counts.Medium} accent="text-amber-600" />
            <SummaryCard label="Interventions" value={stats.interventions} accent="text-indigo-600" />
          </div>

          <RiskDistributionChart distribution={distribution} notAssessed={stats.notAssessed} />

          <AnalyticsSections analytics={analytics} error={analyticsError} />
        </div>
      )}

      {stats && !isAdmin && (
        <LecturerDashboard
          atRiskStudents={stats.atRiskStudents}
          myInterventions={stats.myInterventions}
        />
      )}
    </div>
  );
}

function LecturerDashboard({ atRiskStudents, myInterventions }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <p className="rounded-md bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        Showing all at-risk students requiring intervention
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="At-Risk Students" value={atRiskStudents.length} accent="text-slate-800" />
        <SummaryCard label="Interventions You've Logged" value={myInterventions} accent="text-indigo-600" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Risk Score</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {atRiskStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No at-risk students right now.
                </td>
              </tr>
            )}
            {atRiskStudents.map((s) => {
              const tier = riskTier(s.prediction.risk_score);
              return (
                <tr key={s.student_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3">{s.programme}</td>
                  <td className="px-4 py-3">{s.year_of_study}</td>
                  <td className="px-4 py-3">
                    <RiskBar score={s.prediction.risk_score} percentage={s.prediction.risk_percentage} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tierStyles[tier]}`}>
                      {tier}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => navigate('/interventions', { state: { studentId: s.student_id } })}
                      className="rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Log Intervention
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
