import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RiskBar from './RiskBar';
import { riskTier, tierStyles } from '../utils/risk';

function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Item({ label, children }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{children ?? '—'}</dd>
    </div>
  );
}

function percent(value) {
  return value == null ? '—' : `${value}%`;
}

export default function StudentDetailModal({ student, onClose }) {
  const navigate = useNavigate();
  const closeButtonRef = useRef(null);
  const prediction = student.prediction;
  const tier = riskTier(prediction?.risk_score);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function logIntervention() {
    navigate('/interventions', { state: { studentId: student.student_id } });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="student-detail-title" className="text-lg font-semibold">
              {student.full_name}
            </h2>
            <p className="text-sm text-slate-500">Student #{student.student_id}</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Section title="Student details">
            <Item label="Programme">{student.programme}</Item>
            <Item label="Year of study">{student.year_of_study}</Item>
            <Item label="Units registered">{student.units_registered}</Item>
            <Item label="Fee balance">{student.fee_balance_outstanding ? 'Outstanding' : 'Cleared'}</Item>
            <Item label="Prior unit failure">{student.prior_unit_failure ? 'Yes' : 'No'}</Item>
          </Section>

          <Section title="Academic record">
            {student.record_id == null ? (
              <p className="col-span-2 text-slate-500">No academic record yet.</p>
            ) : (
              <>
                <Item label="Attendance rate">{percent(student.attendance_rate)}</Item>
                <Item label="CAT score average">{percent(student.cat_score_avg)}</Item>
                <Item label="Assignment submission">{percent(student.assignment_submission_rate)}</Item>
                <Item label="Late submission">{percent(student.late_submission_rate)}</Item>
                <Item label="Semester">{student.semester}</Item>
                <Item label="Academic year">{student.academic_year}</Item>
              </>
            )}
          </Section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Latest prediction
            </h3>
            {prediction ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-slate-500">Risk score</p>
                  <RiskBar
                    score={prediction.risk_score}
                    percentage={prediction.risk_percentage}
                    width="w-full max-w-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <p className="text-slate-500">Risk level</p>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tierStyles[tier]}`}
                    >
                      {tier}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-500">Model label</p>
                    <p className="font-medium text-slate-800">{prediction.risk_label}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Generated</p>
                    <p className="font-medium text-slate-800">
                      {prediction.generated_at
                        ? new Date(prediction.generated_at).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Not assessed yet. Run a prediction from the student list.
              </p>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            onClick={logIntervention}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Log Intervention
          </button>
        </div>
      </div>
    </div>
  );
}
