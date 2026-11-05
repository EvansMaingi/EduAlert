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
import StudentName from '../components/StudentName';
import { useAuth } from '../context/AuthContext';
import {
  isAtRisk,
  latestPredictionByStudent,
  riskTier,
  TIERS,
  tierColors,
  tierStyles,
} from '../utils/risk';

// Stat card tones: number colour and icon badge tint.
const CARD_TONES = {
  blue: { number: 'text-fg', badge: 'bg-brand-400/15 text-brand-300' },
  red: { number: 'text-risk-high', badge: 'bg-risk-high/15 text-risk-high' },
  amber: { number: 'text-risk-medium', badge: 'bg-risk-medium/15 text-risk-medium' },
  green: { number: 'text-risk-low', badge: 'bg-risk-low/15 text-risk-low' },
};

// 16px stroke icons for the stat cards.
const CARD_ICONS = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0M12 9v4m0 4h.01',
  warning: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-14v4m0 4h.01',
  clipboard: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m1-2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1m0 12 2 2 4-4',
};

function SummaryCard({ label, value, tone, icon }) {
  const { number, badge } = CARD_TONES[tone];
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${badge}`}>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={CARD_ICONS[icon]} />
          </svg>
        </span>
      </div>
      <p className={`metric-value mt-2 text-[28px] font-extrabold tracking-[-1px] ${number}`}>{value}</p>
    </div>
  );
}

function DistributionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, count, tier } = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: tierColors[tier] }} />
        <span className="font-medium text-fg">{label}</span>
      </div>
      <p className="mt-0.5 text-fg-2">
        {count} {count === 1 ? 'student' : 'students'}
      </p>
    </div>
  );
}

function RiskDistributionChart({ distribution, notAssessed }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Risk distribution</h2>
      <p className="mb-4 text-sm text-fg-muted">
        Students by their latest prediction
        {notAssessed > 0 && ` · ${notAssessed} not yet assessed`}
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 24, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="#383c50" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: '#383c50' }}
              tick={{ fill: '#cbd5e1', fontSize: 13 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <Tooltip content={<DistributionTooltip />} cursor={{ fill: '#2d3148' }} />
            <Bar dataKey="count" maxBarSize={72} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {distribution.map((d) => (
                <Cell key={d.tier} fill={tierColors[d.tier]} />
              ))}
              <LabelList dataKey="count" position="top" fill="#cbd5e1" fontSize={13} fontWeight={600} />
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
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-fg">{payload[0].payload.fullLabel}</p>
      {GROUPED_SERIES.map(({ tier, dataKey, name }) => {
        const count = payload[0].payload[dataKey];
        return (
          <div key={tier} className="flex items-center gap-2 text-fg-2">
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
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-2">
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
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-fg-muted">{subtitle}</p>
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
                <CartesianGrid vertical={false} stroke="#383c50" />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  axisLine={{ stroke: '#383c50' }}
                  tick={{ fill: '#cbd5e1', fontSize: 13 }}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip content={<GroupedTooltip />} cursor={{ fill: '#2d3148' }} />
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
                      fill="#cbd5e1"
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
        <p className="py-8 text-center text-sm text-fg-muted">No assessed students yet.</p>
      )}
    </div>
  );
}

function TopAtRiskList({ students }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Top 5 At-Risk Students</h2>
      <p className="mb-4 text-sm text-fg-muted">Highest risk scores requiring immediate attention</p>
      {students.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-muted">No at-risk students right now.</p>
      ) : (
        <ol className="divide-y divide-line-subtle">
          {students.map((s, i) => (
            <li key={s.student_id}>
              <button
                type="button"
                onClick={() => navigate('/students')}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-2 py-3 text-left hover:bg-surface-2 focus:bg-line-subtle focus:outline-none"
              >
                <span className="w-5 text-sm font-semibold tabular-nums text-fg-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <StudentName
                    name={s.full_name}
                    index={s.student_id}
                    detail={`${s.programme || '—'}${s.year_of_study ? ` · Year ${s.year_of_study}` : ''}`}
                  />
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
    return <p className="rounded-lg bg-risk-high/15 px-3 py-2 text-sm text-red-300">{error}</p>;
  }
  if (!analytics) {
    return <p className="text-sm text-fg-muted">Loading analytics…</p>;
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

      {error && <p className="rounded-lg bg-risk-high/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      {!error && !stats && <p className="text-sm text-fg-muted">Loading…</p>}

      {stats && isAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Students" value={stats.totalStudents} tone="blue" icon="users" />
            <SummaryCard label="High Risk" value={stats.counts.High} tone="red" icon="alert" />
            <SummaryCard label="Medium Risk" value={stats.counts.Medium} tone="amber" icon="warning" />
            <SummaryCard label="Interventions" value={stats.interventions} tone="green" icon="clipboard" />
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
      <p className="rounded-lg bg-line-subtle px-4 py-3 text-sm text-fg-2">
        Showing all at-risk students requiring intervention
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="At-Risk Students" value={atRiskStudents.length} tone="red" icon="alert" />
        <SummaryCard label="Interventions You've Logged" value={myInterventions} tone="green" icon="clipboard" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-line bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Risk Score</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {atRiskStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-fg-muted">
                  No at-risk students right now.
                </td>
              </tr>
            )}
            {atRiskStudents.map((s) => {
              const tier = riskTier(s.prediction.risk_score);
              return (
                <tr key={s.student_id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <StudentName name={s.full_name} index={s.student_id} detail={`ID ${s.student_id}`} />
                  </td>
                  <td className="px-4 py-3">{s.programme}</td>
                  <td className="px-4 py-3">{s.year_of_study}</td>
                  <td className="px-4 py-3">
                    <RiskBar score={s.prediction.risk_score} percentage={s.prediction.risk_percentage} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-[20px] px-[9px] py-[3px] text-[11px] font-semibold ${tierStyles[tier]}`}>
                      {tier}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => navigate('/interventions', { state: { studentId: s.student_id } })}
                      className="rounded-md border border-brand-400/40 bg-line-subtle px-3 py-1 text-[11px] font-medium text-brand-300 hover:bg-line"
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
