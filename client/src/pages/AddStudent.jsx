import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PROGRAMMES = [
  'BSc Computer Science',
  'BSc Information Technology',
  'BSc Mathematics',
  'BSc Statistics',
];

const initialForm = {
  full_name: '',
  programme: PROGRAMMES[0],
  year_of_study: '1',
  units_registered: '5',
  fee_balance_outstanding: false,
  prior_unit_failure: false,
  attendance_rate: '',
  cat_score_avg: '',
  assignment_submission_rate: '',
  late_submission_rate: '',
  semester: 'Semester 1',
  academic_year: '2026',
};

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

function PercentInput({ name, value, onChange }) {
  return (
    <input
      type="number"
      name={name}
      required
      min="0"
      max="100"
      step="0.1"
      value={value}
      onChange={onChange}
      className={inputClass}
    />
  );
}

export default function AddStudent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // What has already been saved, so resubmitting after a failure part-way
  // through doesn't create the student or record a second time.
  const saved = useRef({ student: null, record: null });

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!saved.current.student) {
        const { data } = await api.post('/api/students', {
          full_name: form.full_name.trim(),
          programme: form.programme,
          year_of_study: Number(form.year_of_study),
          units_registered: Number(form.units_registered),
          fee_balance_outstanding: form.fee_balance_outstanding,
          prior_unit_failure: form.prior_unit_failure,
        });
        saved.current.student = data;
      }
      const student = saved.current.student;

      if (!saved.current.record) {
        try {
          const { data } = await api.post('/api/academic-records', {
            student_id: student.student_id,
            attendance_rate: Number(form.attendance_rate),
            cat_score_avg: Number(form.cat_score_avg),
            assignment_submission_rate: Number(form.assignment_submission_rate),
            late_submission_rate: Number(form.late_submission_rate),
            semester: form.semester.trim(),
            academic_year: Number(form.academic_year),
          });
          saved.current.record = data;
        } catch (err) {
          throw new Error(
            `The student was saved, but the academic record failed: ${errorMessage(err, 'unknown error')}. ` +
              'Fix the record fields and submit again; the student will not be added twice.'
          );
        }
      }
      const record = saved.current.record;

      try {
        await api.post('/api/predictions/predict', {
          student_id: student.student_id,
          record_id: record.record_id,
          semester: record.semester,
          academic_year: record.academic_year,
          attendance_rate: record.attendance_rate,
          cat_score_avg: record.cat_score_avg,
          assignment_submission_rate: record.assignment_submission_rate,
          late_submission_rate: record.late_submission_rate,
          fee_balance_outstanding: student.fee_balance_outstanding ? 1 : 0,
          prior_unit_failure: student.prior_unit_failure ? 1 : 0,
          year_of_study: student.year_of_study,
          units_registered: student.units_registered,
        });
      } catch (err) {
        throw new Error(
          `The student and academic record were saved, but the prediction failed: ${errorMessage(err, 'unknown error')}. ` +
            'Submit again to retry, or run it later from the Students page.'
        );
      }

      setSuccess('Student added and prediction generated');
      setTimeout(() => navigate('/students'), 1500);
    } catch (err) {
      setError(err.response ? errorMessage(err, 'Failed to add student') : err.message);
      setSubmitting(false);
    }
  }

  // Saved sections are locked: resubmitting skips them, so edits would be ignored.
  const studentSaved = Boolean(saved.current.student);
  const recordSaved = Boolean(saved.current.record);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Add Student</h1>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset
          disabled={studentSaved}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm disabled:opacity-70"
        >
          <legend className="px-1 text-lg font-semibold">Student details</legend>
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Full name">
                <input
                  type="text"
                  name="full_name"
                  required
                  value={form.full_name}
                  onChange={updateField}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Programme">
              <select name="programme" value={form.programme} onChange={updateField} className={inputClass}>
                {PROGRAMMES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Year of study">
              <select
                name="year_of_study"
                value={form.year_of_study}
                onChange={updateField}
                className={inputClass}
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Units registered">
              <input
                type="number"
                name="units_registered"
                required
                min="4"
                max="7"
                value={form.units_registered}
                onChange={updateField}
                className={inputClass}
              />
            </Field>

            <div className="flex flex-col justify-end gap-2 pb-1">
              <Checkbox
                label="Fee balance outstanding"
                name="fee_balance_outstanding"
                checked={form.fee_balance_outstanding}
                onChange={updateField}
              />
              <Checkbox
                label="Prior unit failure"
                name="prior_unit_failure"
                checked={form.prior_unit_failure}
                onChange={updateField}
              />
            </div>
          </div>
        </fieldset>

        <fieldset
          disabled={recordSaved}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm disabled:opacity-70"
        >
          <legend className="px-1 text-lg font-semibold">Academic record</legend>
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Attendance rate %">
              <PercentInput name="attendance_rate" value={form.attendance_rate} onChange={updateField} />
            </Field>
            <Field label="CAT score average %">
              <PercentInput name="cat_score_avg" value={form.cat_score_avg} onChange={updateField} />
            </Field>
            <Field label="Assignment submission rate %">
              <PercentInput
                name="assignment_submission_rate"
                value={form.assignment_submission_rate}
                onChange={updateField}
              />
            </Field>
            <Field label="Late submission rate %">
              <PercentInput
                name="late_submission_rate"
                value={form.late_submission_rate}
                onChange={updateField}
              />
            </Field>
            <Field label="Semester">
              <input
                type="text"
                name="semester"
                required
                value={form.semester}
                onChange={updateField}
                className={inputClass}
              />
            </Field>
            <Field label="Academic year">
              <input
                type="number"
                name="academic_year"
                required
                min="2000"
                max="2100"
                value={form.academic_year}
                onChange={updateField}
                className={inputClass}
              />
            </Field>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : studentSaved ? 'Retry' : 'Add Student'}
        </button>
      </form>
    </div>
  );
}
