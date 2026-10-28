import { useEffect, useState } from 'react';
import api from '../api/axios';

function errorMessage(err, fallback) {
  return err.response?.data?.error || fallback;
}

export default function SupportRequests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingIds, setUpdatingIds] = useState(new Set());

  useEffect(() => {
    // The server returns newest first.
    api
      .get('/api/lecturer/support-requests')
      .then(({ data }) => setRequests(data))
      .catch((err) => setError(errorMessage(err, 'Failed to load support requests')));
  }, []);

  function setUpdating(id, updating) {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      updating ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function markActioned(request) {
    setActionError('');
    setUpdating(request.request_id, true);
    try {
      const { data } = await api.patch(`/api/lecturer/support-requests/${request.request_id}`, {
        status: 'Actioned',
      });
      setRequests((prev) =>
        prev.map((r) => (r.request_id === request.request_id ? { ...r, status: data.status } : r))
      );
    } catch (err) {
      setActionError(errorMessage(err, 'Failed to update support request'));
    } finally {
      setUpdating(request.request_id, false);
    }
  }

  const pendingCount = requests?.filter((r) => r.status !== 'Actioned').length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Student Support Requests</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        {requests ? `${pendingCount} pending` : 'Requests submitted by students in the Student Portal'}
      </p>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {actionError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      {!error && !requests && <p className="text-sm text-slate-500">Loading…</p>}

      {requests && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Support Type</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No support requests yet.
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.request_id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {r.requested_at ? new Date(r.requested_at).toLocaleString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{r.full_name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.support_type}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{r.notes || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.status === 'Actioned' ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Actioned
                      </span>
                    ) : (
                      <button
                        onClick={() => markActioned(r)}
                        disabled={updatingIds.has(r.request_id)}
                        className="rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                      >
                        {updatingIds.has(r.request_id) ? 'Saving…' : 'Mark as Actioned'}
                      </button>
                    )}
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
