'use client';

import { Modal, Badge, Button } from '../../_components/ui';
import type { PackageRegistrationRow } from '../../../lib/portalApi';
import type { InitialPerson } from './AddRegistrationModal';

export function PersonDetailsModal({
  open,
  onClose,
  registrations,
  onAddPackages,
  onViewReceipts,
  onMarkPaid,
}: {
  open: boolean;
  onClose: () => void;
  registrations: PackageRegistrationRow[];
  onAddPackages: (person: InitialPerson) => void;
  onViewReceipts: (row: PackageRegistrationRow) => void;
  onMarkPaid: (row: PackageRegistrationRow) => void;
}) {
  if (!open || registrations.length === 0) return null;
  const first = registrations[0];
  const person: InitialPerson = {
    customerName: first.customerName,
    customerPhone: first.customerPhone,
    customerEmail: first.customerEmail ?? undefined,
    customerAge: first.customerAge ?? undefined,
  };

  return (
    <Modal open={open} onClose={onClose} title="Person details" size="lg">
      <div className="mb-4">
        <p className="font-semibold text-ui-textPrimary">{first.customerName}</p>
        <p className="text-sm text-ui-textMuted">{first.customerPhone}</p>
        {first.customerEmail && <p className="text-sm text-ui-textMuted">{first.customerEmail}</p>}
      </div>
      <p className="text-sm text-ui-textMuted mb-3">Registrations ({registrations.length})</p>
      <ul className="space-y-2 max-h-[50vh] overflow-y-auto rounded-lg border border-ui-border divide-y divide-ui-border">
        {registrations.map((r) => {
          const collected = r.collected ?? 0;
          const finalPrice = r.finalPriceJod ?? 0;
          const status = collected >= finalPrice ? 'Paid' : collected > 0 ? 'Partial' : 'Unpaid';
          return (
            <li key={r.id} className="p-3 flex flex-wrap items-center justify-between gap-2 bg-ui-softBg/30">
              <div>
                <span className="font-medium text-ui-textPrimary">{r.packageName}</span>
                <span className="ml-2 text-sm text-ui-textMuted">
                  {r.finalPriceJod ?? 0} JOD · {status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status === 'Paid' ? 'success' : status === 'Partial' ? 'warning' : 'danger'}>{status}</Badge>
                {status !== 'Paid' && (
                  <Button size="sm" variant="primary" onClick={() => onMarkPaid(r)}>Mark paid</Button>
                )}
                {(collected > 0 || status === 'Paid') && (
                  <Button size="sm" variant="secondary" onClick={() => onViewReceipts(r)}>Receipts</Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={() => { onClose(); onAddPackages(person); }}>Add packages</Button>
      </div>
    </Modal>
  );
}
