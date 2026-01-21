'use client';

import { useState, useEffect } from 'react';
import { Modal, Select, Input, Button } from '../../_components/ui';
import { financeApi, subscriptionsApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../../../lib/getApiBaseUrl';

const COMPANY_NAME = 'Infinity Sporty';
const API_BASE_URL = getApiBaseUrl();

export function CreateInvoiceFromSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState('Shemisani, Princess Alia College');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [dueDate, setDueDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (open) {
      loadSubscriptions();
    }
  }, [open]);

  async function loadSubscriptions() {
    try {
      const company = await getFirstCompany();
      const data = await subscriptionsApi.list(company?.id);
      // Filter to only active subscriptions
      const activeSubs = data.filter((sub: any) => sub.status === 'ACTIVE');
      setSubscriptions(activeSubs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedSubscriptionId) {
      setError('Please select a subscription');
      return;
    }

    const subscription = subscriptions.find((s) => s.id === selectedSubscriptionId);
    if (!subscription) {
      setError('Selected subscription not found');
      return;
    }

    setLoading(true);

    const company = await getFirstCompany();
    if (!company) {
      setError('No company found. Please create a company first.');
      setLoading(false);
      return;
    }

    try {
      const member = subscription.member;
      const offer = subscription.offer;

      // Create invoice from subscription
      const created = await financeApi.invoices.create({
        amount: offer.pricePerMonth || 0,
        currency: 'JOD',
        status: 'DRAFT',
        paymentMethod,
        issuedAt: new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,

        // Company and member relations
        company: { connect: { id: company.id } },
        ...(member ? { member: { connect: { id: member.id } } } : {}),
        subscription: { connect: { id: subscription.id } },

        // Enterprise invoice fields
        companyName: COMPANY_NAME,
        companyAddress: companyAddress.trim(),
        clientName: member ? `${member.firstName} ${member.lastName}` : 'N/A',
        clientEmail: member?.email || '',
        clientAddress: member?.address || '',

        // Line items - membership subscription
        lineItems: [
          {
            description: `${offer.name} - Membership Subscription`,
            quantity: 1,
            unitPrice: offer.pricePerMonth || 0,
            lineTotal: offer.pricePerMonth || 0,
          },
        ],
        subtotal: offer.pricePerMonth || 0,
        notes: `Membership subscription: ${offer.name}. Period: ${new Date(subscription.startDate).toLocaleDateString()}${subscription.endDate ? ` - ${new Date(subscription.endDate).toLocaleDateString()}` : ''}`,
        generatePdf: true,
      });

      // Download PDF immediately if available
      if (created?.pdfPath) {
        const pdfUrl = `${API_BASE_URL}${created.pdfPath}`;
        const res = await fetch(pdfUrl, { cache: 'no-store' });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${created.number || 'invoice'}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice from subscription');
    } finally {
      setLoading(false);
    }
  }

  const selectedSubscription = subscriptions.find((s) => s.id === selectedSubscriptionId);
  const offer = selectedSubscription?.offer;
  const member = selectedSubscription?.member;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Invoice from Subscription"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-invoice-from-subscription-form" isLoading={loading} disabled={!selectedSubscriptionId}>
            Create Invoice
          </Button>
        </>
      }
    >
      <form id="create-invoice-from-subscription-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Select
          label="Select Subscription *"
          value={selectedSubscriptionId}
          onChange={(e) => setSelectedSubscriptionId(e.target.value)}
          required
          options={[
            { value: '', label: 'Select a subscription...' },
            ...subscriptions.map((sub) => ({
              value: sub.id,
              label: `${sub.offer?.name || 'Unknown'} - ${sub.member ? `${sub.member.firstName} ${sub.member.lastName}` : 'No Member'} (${sub.offer?.pricePerMonth || 0} JOD/month)`,
            })),
          ]}
        />

        {selectedSubscription && (
          <>
            <div className="rounded-lg border border-ui-border bg-ui-softBg p-4 space-y-2">
              <div className="text-sm">
                <span className="font-semibold text-textPrimary">Member:</span>{' '}
                <span className="text-textMuted">
                  {member ? `${member.firstName} ${member.lastName}` : 'N/A'}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-textPrimary">Email:</span>{' '}
                <span className="text-textMuted">{member?.email || 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-textPrimary">Membership:</span>{' '}
                <span className="text-textMuted">{offer?.name || 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-textPrimary">Price:</span>{' '}
                <span className="text-textMuted">{offer?.pricePerMonth || 0} JOD/month</span>
              </div>
            </div>

            <Input
              label="Company address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              required
            />

            <Select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CARD' | 'CASH')}
              options={[
                { value: 'CARD', label: 'Visa / MasterCard' },
                { value: 'CASH', label: 'Cash' },
              ]}
            />

            <Input
              label="Due date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </>
        )}

        {subscriptions.length === 0 && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            No active subscriptions found. Create a subscription first.
          </div>
        )}
      </form>
    </Modal>
  );
}
