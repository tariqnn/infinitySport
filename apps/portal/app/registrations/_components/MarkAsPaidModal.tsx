'use client';

import { useEffect, useState } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

export function MarkAsPaidModal({
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
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [privateNote, setPrivateNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAmount = registration?.finalPriceJod ?? 0;
  const isFreeRegistration = defaultAmount <= 0;
  const amount = amountPaid.trim() ? Number(amountPaid) : defaultAmount;

  useEffect(() => {
    if (!open) return;
    setAmountPaid(registration?.finalPriceJod != null ? String(registration.finalPriceJod) : '');
    setPaymentMethod('CASH');
    setPrivateNote('');
    setError(null);
  }, [open, registration?.id, registration?.finalPriceJod]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!privateNote.trim()) {
      setError('Private note is required.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0 || (!isFreeRegistration && amount <= 0)) {
      setError(isFreeRegistration ? 'Amount paid cannot be negative.' : 'Amount paid must be greater than 0.');
      return;
    }
    if (!registration) return;
    setLoading(true);
    try {
      await packageRegistrationsApi.markPaid(registration.id, {
        amountPaid: amount,
        paymentMethod,
        privateNote: privateNote.trim(),
      });
      onSuccess();
      onClose();
      setAmountPaid('');
      setPrivateNote('');
    } catch (err: any) {
      setError(err?.message || 'Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title="Mark as Paid" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <p className="text-sm text-ui-textMuted">
          {isFreeRegistration ? 'Confirming a free registration for ' : 'Creating a receipt for '}
          <strong>{registration.customerName}</strong> ({registration.packageName}).
        </p>
        <Input
          label="Amount paid (JOD)"
          type="number"
          min={0}
          step="0.01"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          placeholder={defaultAmount ? String(defaultAmount) : '0'}
          hint={isFreeRegistration ? 'Free registrations can be confirmed with 0 JOD.' : undefined}
        />
        <Select
          label="Payment method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={PAYMENT_METHODS}
        />
        <Input
          label="Private note (required)"
          value={privateNote}
          onChange={(e) => setPrivateNote(e.target.value)}
          required
          placeholder="e.g. Cash received at front desk"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={!privateNote.trim()}>
            {isFreeRegistration ? 'Confirm Free Registration' : 'Confirm & Create Receipt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
