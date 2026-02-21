'use client';

import { Modal, Badge } from '../../_components/ui';
import type { PackageRegistrationRow } from '../../../lib/portalApi';

export function RegistrationDetailsModal({
  open,
  onClose,
  registration,
  onViewReceipts,
}: {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
  onViewReceipts: (registration: PackageRegistrationRow) => void;
}) {
  if (!registration) return null;
  const collected = registration.collected ?? 0;
  const paymentStatus = registration.isPaid ? 'Paid' : collected > 0 ? 'Partial' : 'Unpaid';

  return (
    <Modal open={open} onClose={onClose} title="Registration details" size="sm">
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-ui-textMuted">Package</p>
          <p className="font-medium text-ui-textPrimary">{registration.packageName}</p>
        </div>
        <div>
          <p className="text-ui-textMuted">Name</p>
          <p className="text-ui-textPrimary">{registration.customerName}</p>
        </div>
        <div>
          <p className="text-ui-textMuted">Phone</p>
          <p className="text-ui-textPrimary">{registration.customerPhone}</p>
        </div>
        <div>
          <p className="text-ui-textMuted">Email</p>
          <p className="text-ui-textPrimary break-all">{registration.customerEmail || '—'}</p>
        </div>
        <div>
          <p className="text-ui-textMuted">Registered</p>
          <p className="text-ui-textPrimary">
            {new Date(registration.createdAt).toLocaleString()}
          </p>
        </div>
        {registration.periodStartsAt && (
          <div>
            <p className="text-ui-textMuted">Starts</p>
            <p className="text-ui-textPrimary">
              {new Date(registration.periodStartsAt).toLocaleDateString()}
            </p>
          </div>
        )}
        <div>
          <p className="text-ui-textMuted">Payment</p>
          <p className="text-ui-textPrimary">
            <Badge variant={paymentStatus === 'Paid' ? 'success' : paymentStatus === 'Partial' ? 'warning' : 'danger'}>
              {paymentStatus}
            </Badge>
            {collected > 0 && <span className="ml-2 text-ui-textMuted">{collected} JOD collected</span>}
          </p>
        </div>
        {registration.isFrozen && (
          <div>
            <p className="text-ui-textMuted">Status</p>
            <Badge variant="neutral">Frozen</Badge>
          </div>
        )}
        <div className="pt-2 border-t border-ui-border">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewReceipts(registration);
            }}
            className="text-brand-blue-primary hover:underline font-medium"
          >
            View Receipt(s)
          </button>
        </div>
      </div>
    </Modal>
  );
}
