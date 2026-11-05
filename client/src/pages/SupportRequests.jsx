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
      <p className="mb-6 mt-1 text-sm text-fg-muted">
        {requests ? `${pendingCount} pending` : 'Requests submitted by students in the Student Portal'}
      </p>

      {error && <p className="rounded-lg bg-risk-high/15 px-3 py-2 text-sm text-red-300">{error}</p>}
      {actionError && (
        <p className="mb-4 rounded-lg bg-risk-high/15 px-3 py-2 text-sm text-red-300">{actionError}</p>
      )}

      {!error && !requests && <p className="text-sm text-fg-muted">Loading…</p>}

      {requests && (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Support Type</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-fg-muted">
                    No support requests yet.
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.request_id} className="align-top hover:bg-surface-2">
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                    {r.requested_at ? new Date(r.requested_at).toLocaleString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{r.full_name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.support_type}</td>
                  <td className="max-w-xs px-4 py-3 text-fg-2">{r.notes || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.status === 'Actioned' ? (
                      <span className="rounded-[20px] border border-risk-low/30 bg-risk-low/15 px-[9px] py-[3px] text-[11px] font-semibold text-risk-low">
                        Actioned
                      </span>
                    ) : (
                      <button
                        onClick={() => markActioned(r)}
                        disabled={updatingIds.has(r.request_id)}
                        className="rounded-md border border-brand-400/40 bg-line-subtle px-3 py-1 text-[11px] font-medium text-brand-300 hover:bg-line disabled:opacity-60"
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
