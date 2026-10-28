import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
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

const editInputClass =
  'mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-normal focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function NumberInput({ label, value, onChange, min, max, step = '1' }) {
  return (
    <input
      type="number"
      required
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={editInputClass}
    />
  );
}

function YesNoSelect({ label, value, onChange, yes, no }) {
  return (
    <select
      aria-label={label}
      value={value ? 'yes' : 'no'}
      onChange={(e) => onChange(e.target.value === 'yes')}
      className={editInputClass}
    >
      <option value="yes">{yes}</option>
      <option value="no">{no}</option>
    </select>
  );
}

const RATE_FIELDS = [
  ['attendance_rate', 'Attendance rate'],
  ['cat_score_avg', 'CAT score average'],
  ['assignment_submission_rate', 'Assignment submission'],
  ['late_submission_rate', 'Late submission'],
];

// The editable fields as form values (numbers as strings for the inputs).
function formFromStudent(student) {
  return {
    year_of_study: String(student.year_of_study ?? ''),
    units_registered: String(student.units_registered ?? ''),
    fee_balance_outstanding: Boolean(student.fee_balance_outstanding),
    prior_unit_failure: Boolean(student.prior_unit_failure),
    attendance_rate: String(student.attendance_rate ?? ''),
    cat_score_avg: String(student.cat_score_avg ?? ''),
    assignment_submission_rate: String(student.assignment_submission_rate ?? ''),
    late_submission_rate: String(student.late_submission_rate ?? ''),
  };
}

const messageStyles = {
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  error: 'bg-red-50 text-red-700',
};

// canEdit shows the Edit button (admins). onSaved(row) receives the updated
// student row from PUT /api/students/:id/academic-record so the caller can
// update its list without reloading.
export default function StudentDetailModal({ student, onClose, canEdit = false, onSaved }) {
  const navigate = useNavigate();
  const closeButtonRef = useRef(null);
  const prediction = student.prediction;
  const tier = riskTier(prediction?.risk_score);
  const hasRecord = student.record_id != null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => formFromStudent(student));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // While editing, Escape cancels the edit instead of closing the modal, so
  // unsaved changes aren't lost by accident. Nothing happens while saving.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape' || saving) return;
      if (editing) cancelEdit();
      else onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  function logIntervention() {
    navigate('/interventions', { state: { studentId: student.student_id } });
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit() {
    setForm(formFromStudent(student));
    setMessage({ type: '', text: '' });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setMessage({ type: '', text: '' });
  }

  // Saves the changes; the server then re-runs the prediction.
  async function save(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);
    try {
      const { data } = await api.put(`/api/students/${student.student_id}/academic-record`, {
        year_of_study: Number(form.year_of_study),
        units_registered: Number(form.units_registered),
        fee_balance_outstanding: form.fee_balance_outstanding,
        prior_unit_failure: form.prior_unit_failure,
        attendance_rate: Number(form.attendance_rate),
        cat_score_avg: Number(form.cat_score_avg),
        assignment_submission_rate: Number(form.assignment_submission_rate),
        late_submission_rate: Number(form.late_submission_rate),
      });
      onSaved?.(data);
      setEditing(false);
      if (data.prediction_error) {
        setMessage({
          type: 'warning',
          text: `Changes saved, but the prediction could not be re-run: ${data.prediction_error}. Use Run Prediction to try again.`,
        });
      } else if (data.prediction?.warning) {
        setMessage({ type: 'warning', text: `Changes saved and prediction updated. ${data.prediction.warning}` });
      } else {
        setMessage({ type: 'success', text: 'Changes saved and prediction updated.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={editing || saving ? undefined : onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
        onSubmit={save}
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
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                onClick={startEdit}
                disabled={!hasRecord}
                title={hasRecord ? undefined : 'This student has no academic record to edit'}
                className="rounded-md border border-indigo-200 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit
              </button>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
            <button
              type="button"
              ref={closeButtonRef}
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {message.text && (
            <p role="status" className={`rounded-md px-3 py-2 text-sm ${messageStyles[message.type]}`}>
              {message.text}
            </p>
          )}

          <Section title="Student details">
            <Item label="Programme">{student.programme}</Item>
            <Item label="Year of study">
              {editing ? (
                <NumberInput
                  label="Year of study"
                  min="1"
                  max="4"
                  value={form.year_of_study}
                  onChange={(v) => setField('year_of_study', v)}
                />
              ) : (
                student.year_of_study
              )}
            </Item>
            <Item label="Units registered">
              {editing ? (
                <NumberInput
                  label="Units registered"
                  min="1"
                  max="10"
                  value={form.units_registered}
                  onChange={(v) => setField('units_registered', v)}
                />
              ) : (
                student.units_registered
              )}
            </Item>
            <Item label="Fee balance">
              {editing ? (
                <YesNoSelect
                  label="Fee balance"
                  yes="Outstanding"
                  no="Cleared"
                  value={form.fee_balance_outstanding}
                  onChange={(v) => setField('fee_balance_outstanding', v)}
                />
              ) : student.fee_balance_outstanding ? (
                'Outstanding'
              ) : (
                'Cleared'
              )}
            </Item>
            <Item label="Prior unit failure">
              {editing ? (
                <YesNoSelect
                  label="Prior unit failure"
                  yes="Yes"
                  no="No"
                  value={form.prior_unit_failure}
                  onChange={(v) => setField('prior_unit_failure', v)}
                />
              ) : student.prior_unit_failure ? (
                'Yes'
              ) : (
                'No'
              )}
            </Item>
          </Section>

          <Section title="Academic record">
            {!hasRecord ? (
              <p className="col-span-2 text-slate-500">No academic record yet.</p>
            ) : (
              <>
                {RATE_FIELDS.map(([field, label]) => (
                  <Item key={field} label={editing ? `${label} (%)` : label}>
                    {editing ? (
                      <NumberInput
                        label={label}
                        min="0"
                        max="100"
                        step="any"
                        value={form[field]}
                        onChange={(v) => setField(field, v)}
                      />
                    ) : (
                      percent(student[field])
                    )}
                  </Item>
                ))}
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
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={logIntervention}
            disabled={editing || saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Log Intervention
          </button>
        </div>
      </form>
    </div>
  );
}
