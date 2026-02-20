'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '../../_components/ui';
import { packageRegistrationsApi, receiptsApi, type PackageRegistrationRow, type ReceiptRow } from '../../../lib/portalApi';

export function ViewReceiptsModal({
  open,
  onClose,
  registration,
  onViewReceipt,
  onVoided,
}: {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
  onViewReceipt: (receiptId: string) => void;
  onVoided?: () => void;
}) {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && registration) {
      setLoading(true);
      packageRegistrationsApi.getReceipts(registration.id).then(setReceipts).catch(() => setReceipts([])).finally(() => setLoading(false));
    } else setReceipts([]);
  }, [open, registration?.id]);

  async function handleVoid(r: ReceiptRow) {
    const reason = window.prompt('Void reason (required):');
    if (!reason?.trim()) return;
    setVoidingId(r.id);
    try {
      await receiptsApi.void(r.id, reason.trim());
      onVoided?.();
      setReceipts((prev) => prev.filter((x) => x.id !== r.id));
    } finally {
      setVoidingId(null);
    }
  }

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title="Receipts" size="md">
      <div className="space-y-4">
        <p className="text-sm text-ui-textMuted">
          Receipts for <strong>{registration.customerName}</strong> — {registration.packageName}. Voiding a receipt marks it unpaid and updates the registration.
        </p>
        {loading ? (
          <p className="text-ui-textMuted">Loading…</p>
        ) : receipts.length === 0 ? (
          <p className="text-ui-textMuted">No receipts yet.</p>
        ) : (
          <ul className="space-y-2">
            {receipts.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ui-border bg-white p-3"
              >
                <div>
                  <span className="font-semibold text-ui-textPrimary">{r.receiptId}</span>
                  <span className="ml-2 text-sm text-ui-textMuted">
                    {r.amountPaid} JOD · {r.paymentMethod} · {new Date(r.dateTimeIssued).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onViewReceipt(r.id)}>
                    View / Print
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVoid(r)}
                    disabled={!!voidingId}
                  >
                    {voidingId === r.id ? 'Voiding…' : 'Void (mark unpaid)'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ReceiptDetailModal({
  receiptId,
  open,
  onClose,
  onVoided,
}: {
  receiptId: string;
  open: boolean;
  onClose: () => void;
  onVoided?: () => void;
}) {
  const [receipt, setReceipt] = useState<(ReceiptRow & {
    registration?: PackageRegistrationRow;
    user?: { id: string; email: string; name: string | null; isActive: boolean };
  }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && receiptId) {
      setLoading(true);
      receiptsApi.get(receiptId).then(setReceipt).finally(() => setLoading(false));
    } else setReceipt(null);
  }, [open, receiptId]);

  function handlePrint() {
    const printEl = document.getElementById('receipt-print-area');
    if (printEl) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printEl.innerHTML);
        w.document.close();
        w.print();
        w.close();
      }
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Receipt" size="md">
      <div className="space-y-4">
        {loading ? (
          <p className="text-ui-textMuted">Loading…</p>
        ) : !receipt ? (
          <p className="text-ui-textMuted">Receipt not found.</p>
        ) : (
          <>
            <div id="receipt-print-area" className="rounded-xl border border-ui-border bg-white p-6 text-ui-textPrimary print:border-0 print:shadow-none">
              <div className="mb-4 border-b border-ui-border pb-3">
                <h3 className="text-lg font-bold">Infinity Sports</h3>
                <p className="text-sm text-ui-textMuted">Receipt {receipt.receiptId}</p>
              </div>
              {(receipt as { user?: { email: string } }).user && (
                <p className="mb-3 rounded-lg bg-ui-primary/10 px-3 py-2 text-sm text-ui-primary">
                  Linked account: {(receipt as { user: { email: string } }).user.email}
                </p>
              )}
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 text-ui-textMuted">Date</td><td>{new Date(receipt.dateTimeIssued).toLocaleString()}</td></tr>
                  <tr><td className="py-1 text-ui-textMuted">Name</td><td>{receipt.personName}</td></tr>
                  <tr><td className="py-1 text-ui-textMuted">Phone</td><td>{receipt.personPhone}</td></tr>
                  <tr><td className="py-1 text-ui-textMuted">Package</td><td>{receipt.packageName}</td></tr>
                  <tr><td className="py-1 text-ui-textMuted">Amount</td><td><strong>{receipt.amountPaid} JOD</strong></td></tr>
                  <tr><td className="py-1 text-ui-textMuted">Method</td><td>{receipt.paymentMethod}</td></tr>
                  <tr><td className="py-1 text-ui-textMuted">Note</td><td>{receipt.privateNote}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handlePrint}>
                Print / Download
              </Button>
              {!receipt.voidedAt && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const reason = prompt('Void reason (required):');
                    if (reason?.trim()) {
                      await receiptsApi.void(receiptId, reason.trim());
                      onVoided?.();
                      onClose();
                    }
                  }}
                >
                  Void receipt
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
