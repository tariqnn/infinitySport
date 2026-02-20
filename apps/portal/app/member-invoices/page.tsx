'use client';

import { useState } from 'react';
import Link from 'next/link';
import { meApi, type MemberInvoiceRow } from '../../lib/portalApi';
import { Button } from '../_components/ui';

export default function MemberInvoicesPage() {
  const [email, setEmail] = useState('');
  const [invoices, setInvoices] = useState<MemberInvoiceRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    const e = email.trim();
    if (!e) {
      setError('Enter the email used at registration.');
      return;
    }
    setLoading(true);
    setError(null);
    setInvoices(null);
    try {
      const list = await meApi.getInvoices(e);
      setInvoices(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ui-textPrimary">Member Invoices</h1>
        <p className="mt-1 text-sm text-ui-textMuted">
          View invoices (receipts) linked to your account. Use the same email you used when registering.
        </p>
      </div>

      <div className="rounded-xl border border-ui-border bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-ui-textPrimary">Email (registration email)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            placeholder="you@example.com"
            className="min-w-[220px] rounded-lg border border-ui-border bg-white px-3 py-2 text-ui-textPrimary shadow-sm focus:border-brand-primaryBlue focus:outline-none focus:ring-1 focus:ring-brand-primaryBlue"
          />
          <Button variant="primary" onClick={handleLoad} disabled={loading}>
            {loading ? 'Loading…' : 'Load my invoices'}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {invoices && (
        <div className="rounded-xl border border-ui-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-ui-border bg-ui-softBg px-4 py-3">
            <h2 className="font-semibold text-ui-textPrimary">Your invoices</h2>
          </div>
          {invoices.length === 0 ? (
            <p className="p-6 text-ui-textMuted">No invoices found for this email.</p>
          ) : (
            <ul className="divide-y divide-ui-border">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-ui-textPrimary">{inv.invoiceNumber}</span>
                    <span className="ml-2 text-sm text-ui-textMuted">
                      {inv.packageName ?? ''} · {new Date(inv.date).toLocaleDateString()} · {inv.amount} {inv.currency}
                    </span>
                  </div>
                  <span
                    className={
                      inv.status === 'Refunded'
                        ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
                        : 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                    }
                  >
                    {inv.status}
                  </span>
                  <Link
                    href={`/receipts/${inv.id}`}
                    className="ml-2 text-sm font-medium text-brand-primaryBlue hover:underline"
                  >
                    View / Print
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-sm text-ui-textMuted">
        Same data is visible in the mobile app under Profile → Invoices when signed in with this email.
      </p>
    </div>
  );
}
