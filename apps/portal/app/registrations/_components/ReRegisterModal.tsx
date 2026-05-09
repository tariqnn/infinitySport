'use client';

import { useEffect, useState } from 'react';
import { Modal, Input, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function getDefaultStartDate(registration: PackageRegistrationRow | null): string {
  if (!registration) return new Date().toISOString().slice(0, 10);
  return (
    toDateInputValue(registration.periodEndsAt) ||
    toDateInputValue(registration.nextPaymentDate) ||
    new Date().toISOString().slice(0, 10)
  );
}

export function ReRegisterModal({
  open,
  onClose,
  onSuccess,
  registration,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  registration: PackageRegistrationRow | null;
}) {
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStartDate(getDefaultStartDate(registration));
    setError(null);
  }, [open, registration]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registration) return;
    setError(null);

    if (!startDate.trim()) {
      setError('Start date is required.');
      return;
    }

    setLoading(true);
    try {
      await packageRegistrationsApi.reregister(registration.id, {
        periodStartsAt: startDate.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to re-register');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title="Re-register">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        <div className="rounded-lg border border-ui-border bg-ui-softBg/50 px-3 py-2 text-sm text-ui-textPrimary">
          <div className="font-semibold">{registration.customerName}</div>
          <div className="text-ui-textMuted">{registration.packageName}</div>
        </div>

        <Input
          label="Registration start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          hint="Choose the month this renewal belongs to. Past dates are allowed."
          required
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Re-register
          </Button>
        </div>
      </form>
    </Modal>
  );
}
