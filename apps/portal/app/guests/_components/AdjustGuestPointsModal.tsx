'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Input, Modal, Textarea } from '../../_components/ui';
import {
  guestAccountsApi,
  type GuestAccountRow,
  type GuestPointAdjustmentRow,
} from '../../../lib/portalApi';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function AdjustGuestPointsModal({
  open,
  guest,
  onClose,
  onSaved,
}: {
  open: boolean;
  guest: GuestAccountRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [points, setPoints] = useState('10');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<GuestPointAdjustmentRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !guest?.email) return;
    setLoadingHistory(true);
    setError(null);
    void guestAccountsApi
      .getPointAdjustments(guest.email)
      .then((rows) => setHistory(rows))
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load guest point history.');
        setHistory([]);
      })
      .finally(() => setLoadingHistory(false));
  }, [guest?.email, open]);

  useEffect(() => {
    if (!open) {
      setPoints('10');
      setReason('');
      setError(null);
      setHistory([]);
    }
  }, [open]);

  async function handleSave() {
    if (!guest?.email) return;

    const parsedPoints = Math.round(Number(points || 0));
    if (!Number.isFinite(parsedPoints) || parsedPoints === 0) {
      setError('Enter a non-zero points change. Use negative values to remove points.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await guestAccountsApi.addPointAdjustment(guest.email, {
        points: parsedPoints,
        reason: reason.trim(),
        customerName: guest.name,
      });
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update guest points.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Guest Points"
      description={guest ? `Email: ${guest.email}` : undefined}
      size="lg"
    >
      {guest ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-ui-border bg-ui-softBg p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-ui-textMuted">Total points</p>
              <p className="mt-2 text-2xl font-bold text-ui-textPrimary">{guest.totalPoints}</p>
            </div>
            <div className="rounded-xl border border-ui-border bg-ui-softBg p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-ui-textMuted">Booking rewards</p>
              <p className="mt-2 text-2xl font-bold text-ui-textPrimary">{guest.rewardPoints}</p>
            </div>
            <div className="rounded-xl border border-ui-border bg-ui-softBg p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-ui-textMuted">Manual adjustments</p>
              <p className="mt-2 text-2xl font-bold text-ui-textPrimary">{guest.manualPoints}</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <Input
              label="Points change"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="10 or -10"
            />
            <Textarea
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you adding or removing points?"
              rows={3}
            />
          </div>

          <div className="rounded-xl border border-ui-border">
            <div className="flex items-center justify-between border-b border-ui-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-ui-textPrimary">Adjustment History</h3>
                <p className="mt-1 text-xs text-ui-textMuted">Manual changes made for this guest account.</p>
              </div>
              <Badge variant="neutral">{history.length} entries</Badge>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loadingHistory ? (
                <p className="px-4 py-6 text-sm text-ui-textMuted">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ui-textMuted">No manual adjustments yet.</p>
              ) : (
                <div className="divide-y divide-ui-border">
                  {history.map((row) => (
                    <div key={row.id} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ui-textPrimary">{row.reason}</p>
                        <p className="mt-1 text-xs text-ui-textMuted">{formatDateTime(row.createdAt)}</p>
                      </div>
                      <Badge variant={row.change >= 0 ? 'success' : 'danger'}>
                        {row.change >= 0 ? '+' : ''}
                        {row.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} isLoading={saving}>
              Save Adjustment
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
