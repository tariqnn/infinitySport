'use client';

import { useState } from 'react';
import { Modal, Input, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';

export function IncreaseSessionModal({
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
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    if (!registration) return;
    setLoading(true);
    try {
      await packageRegistrationsApi.addSessionAdjustment(registration.id, { reason: reason.trim() });
      onSuccess();
      onClose();
      setReason('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add session');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title="Increase Session (+1)" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <p className="text-sm text-ui-textMuted">
          Add 1 session for <strong>{registration.customerName}</strong> ({registration.packageName}). This will be logged.
        </p>
        <Input
          label="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="e.g. Session canceled due to holiday"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading} disabled={!reason.trim()}>Confirm +1</Button>
        </div>
      </form>
    </Modal>
  );
}
