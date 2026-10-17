import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function EmailSentIcon({ sent }) {
  return sent ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-700">
      <span aria-hidden="true" className="text-base font-bold leading-none">✓</span>
      <span className="text-xs font-medium">Sent</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-red-700">
      <span aria-hidden="true" className="text-base font-bold leading-none">✗</span>
      <span className="text-xs font-medium">Not sent</span>
    </span>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get('/api/notifications')
      .then(({ data }) => setNotifications(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load notifications'));
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Notification Log</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && !notifications && <p className="text-sm text-slate-500">Loading…</p>}

      {notifications && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Email Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No notifications sent yet.
                  </td>
                </tr>
              )}
              {notifications.map((n) => (
                <tr key={n.notification_id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {n.sent_at ? new Date(n.sent_at).toLocaleString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{n.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    {n.message}
                    {n.email_recipient && (
                      <span className="mt-0.5 block text-xs text-slate-500">To: {n.email_recipient}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <EmailSentIcon sent={n.email_sent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
