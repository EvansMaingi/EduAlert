import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StudentName from '../components/StudentName';

const inputClass =
  'w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

const roleStyles = {
  admin: 'border border-brand/20 bg-line-subtle text-brand',
  lecturer: 'border border-slate-200 bg-slate-100 text-slate-600',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'lecturer' };

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-fg-2">{label}</span>
      {children}
    </label>
  );
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && !saving) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  function updateField(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/api/users', form);
      onCreated(data);
    } catch (err) {
      setError(errorMessage(err, 'Failed to create user'));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={saving ? undefined : onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-title"
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="add-user-title" className="text-lg font-semibold">
            Add User
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-fg-muted hover:bg-surface-2 hover:text-fg-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Field label="Full Name">
            <input
              ref={firstFieldRef}
              name="name"
              value={form.name}
              onChange={updateField}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input type="email" name="email" value={form.email} onChange={updateField} required className={inputClass} />
          </Field>
          <Field label="Password">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-fg-muted">
              At least 8 characters. It will be emailed to the new user.
            </span>
          </Field>
          <Field label="Role">
            <select name="role" value={form.role} onChange={updateField} className={inputClass}>
              <option value="lecturer">Lecturer</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-line bg-transparent px-4 py-2 text-sm font-medium text-fg-2 hover:bg-surface-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_3px_rgba(37,99,235,.3)] hover:bg-sidebar-active disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingIds, setDeletingIds] = useState(() => new Set());

  async function loadUsers() {
    try {
      const { data } = await api.get('/api/users');
      setUsers(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load users'));
    }
  }

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleCreated(created) {
    setShowAdd(false);
    setUsers((prev) => [created, ...(prev || [])]);
    setNotice(
      created.email_sent
        ? { type: 'success', text: `${created.name} was added and a welcome email was sent to ${created.email}.` }
        : {
            type: 'warning',
            text: `${created.name} was added, but the welcome email could not be sent${
              created.email_error ? ` (${created.email_error})` : ''
            }. Share their login details with them directly.`,
          }
    );
  }

  async function deleteUser(target) {
    const confirmed = window.confirm(`Are you sure you want to delete ${target.name}? They will no longer be able to log in.`);
    if (!confirmed) return;

    setNotice(null);
    setDeletingIds((prev) => new Set(prev).add(target.id));
    try {
      await api.delete(`/api/users/${target.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      setNotice({ type: 'success', text: `${target.name} was deleted.` });
    } catch (err) {
      setNotice({ type: 'error', text: `${target.name}: ${errorMessage(err, 'Failed to delete user')}` });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
    }
  }

  const noticeStyles = {
    success: 'bg-emerald-50 text-emerald-800',
    warning: 'bg-amber-50 text-amber-800',
    error: 'bg-red-50 text-red-700',
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_3px_rgba(37,99,235,.3)] hover:bg-sidebar-active"
        >
          Add User
        </button>
      </div>

      {notice && (
        <p role="status" className={`mb-4 rounded-lg px-3 py-2 text-sm ${noticeStyles[notice.type]}`}>
          {notice.text}
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && !users && <p className="text-sm text-fg-muted">Loading…</p>}

      {users && (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-fg-muted">
                    No users yet.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = u.id === user.user_id;
                const deleting = deletingIds.has(u.id);
                return (
                  <tr key={u.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <StudentName name={u.name || u.email} index={u.id} detail={isSelf ? 'You' : undefined} />
                    </td>
                    <td className="px-4 py-3 text-fg-2">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[20px] px-[9px] py-[3px] text-[11px] font-semibold capitalize ${roleStyles[u.role] || roleStyles.lecturer}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteUser(u)}
                        disabled={isSelf || deleting}
                        title={isSelf ? 'You cannot delete your own account' : undefined}
                        className="rounded-md border border-risk-high/20 bg-[#fef2f2] px-3 py-1 text-[11px] font-medium text-risk-high hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </div>
  );
}
