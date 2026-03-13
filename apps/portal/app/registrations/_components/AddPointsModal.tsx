'use client';

import { useEffect, useState } from 'react';
import { Modal, Input, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';

export function AddPointsModal({
  open,
  onClose,
  registration,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
  onSuccess: () => void;
}) {
  const [points, setPoints] = useState('10');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPoints('10');
    setReason('');
    setError(null);
    setLoading(false);
  }, [open, registration?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!registration) return;

    const parsedPoints = Math.round(Number(points || 0));
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      setError('Points must be greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setLoading(true);
    try {
      await packageRegistrationsApi.addPointAdjustment(registration.id, {
        points: parsedPoints,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add points');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title="Add points" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        <div className="rounded-xl border border-ui-border bg-ui-softBg/40 px-4 py-3 text-sm text-ui-textMuted">
          Add reward points for <strong className="text-ui-textPrimary">{registration.customerName}</strong>.
          The balance is stored in Portal and synced to the mobile app account.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Points to add"
            type="number"
            min={1}
            step={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            required
          />
          <Input
            label="Package"
            value={registration.packageName}
            readOnly
            className="bg-ui-softBg/40"
            hint="Points are added to this player's synced app balance."
          />
        </div>

        <Input
          label="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="e.g. Tournament win bonus"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={!reason.trim()}>
            Add points
          </Button>
        </div>
      </form>
    </Modal>
  );
}
