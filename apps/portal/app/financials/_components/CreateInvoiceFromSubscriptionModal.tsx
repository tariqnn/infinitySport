'use client';

import { useState, useEffect } from 'react';
import { Modal, Select, Input, Button } from '../../_components/ui';
import { financeApi, subscriptionsApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../../../lib/getApiBaseUrl';

const COMPANY_NAME = 'Infinity Sporty';
const API_BASE_URL = getApiBaseUrl();

type ServiceType = 'basketball' | 'padel' | 'court-booking' | 'gym' | 'gymnastics' | 'subscription';

export function CreateInvoiceFromSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('subscription');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState('Shemisani, Princess Alia College');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [dueDate, setDueDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (open) {
      if (serviceType === 'subscription') {
        loadSubscriptions();
      }
    }
  }, [open, serviceType]);

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

    if (serviceType === 'subscription') {
      if (!selectedSubscriptionId) {
        setError('Please select a subscription');
        return;
      }
    } else {
      if (!clientName.trim()) {
        setError('Please enter client name');
        return;
      }
      if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
    }

    setLoading(true);

    const company = await getFirstCompany();

    try {
      let invoiceData: any;

      if (serviceType === 'subscription') {
        const subscription = subscriptions.find((s) => s.id === selectedSubscriptionId);
        if (!subscription) {
          setError('Selected subscription not found');
          setLoading(false);
          return;
        }

        const member = subscription.member;
        const offer = subscription.offer;

        invoiceData = {
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
        };
      } else {
        // Service type invoices (basketball, padel, court-booking, gym, gymnastics)
        const serviceNames: Record<ServiceType, string> = {
          'basketball': 'Basketball Subscription',
          'padel': 'Padel Subscription',
          'court-booking': 'Court Booking',
          'gym': 'Gym Membership',
          'gymnastics': 'Gymnastics Subscription',
          'subscription': '',
        };

        const serviceName = serviceNames[serviceType];
        const invoiceAmount = Math.round(Number(amount)); // Amount in JOD (stored as int, but represents JOD)

        invoiceData = {
          amount: invoiceAmount,
          currency: 'JOD',
          status: 'DRAFT',
          paymentMethod,
          issuedAt: new Date().toISOString(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,

          // Company relation
          company: { connect: { id: company.id } },

          // Enterprise invoice fields
          companyName: COMPANY_NAME,
          companyAddress: companyAddress.trim(),
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || '',
          clientAddress: clientAddress.trim() || '',

          // Line items
          lineItems: [
            {
              description: serviceName,
              quantity: 1,
              unitPrice: Number(amount),
              lineTotal: Number(amount),
            },
          ],
          subtotal: Number(amount),
          notes: `Service: ${serviceName}`,
          generatePdf: true,
        };
      }

      const created = await financeApi.invoices.create(invoiceData);

      // Download PDF immediately if available
      let pdfPath: string | undefined = created?.pdfPath;
      if (!pdfPath && typeof created?.description === 'string') {
        try {
          const meta = JSON.parse(created.description);
          pdfPath = meta?.pdfPath;
        } catch {}
      }

      if (pdfPath) {
        const pdfUrl = `${API_BASE_URL}${pdfPath}`;
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
      title="Create Invoice"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="create-invoice-from-subscription-form" 
            isLoading={loading} 
            disabled={
              serviceType === 'subscription' 
                ? !selectedSubscriptionId 
                : !clientName.trim() || !amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0
            }
          >
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
          label="Service Type *"
          value={serviceType}
          onChange={(e) => {
            setServiceType(e.target.value as ServiceType);
            setSelectedSubscriptionId('');
            setClientName('');
            setClientEmail('');
            setClientAddress('');
            setAmount('');
          }}
          required
          options={[
            { value: 'subscription', label: 'Existing Subscription' },
            { value: 'basketball', label: 'Basketball Subscription' },
            { value: 'padel', label: 'Padel Subscription' },
            { value: 'court-booking', label: 'Court Booking' },
            { value: 'gym', label: 'Gym Membership' },
            { value: 'gymnastics', label: 'Gymnastics Subscription' },
          ]}
        />

        {serviceType === 'subscription' ? (
          <>
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
        ) : (
          <>
            <Input
              label="Client Name *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Enter client name"
            />
            <Input
              label="Client Email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Enter client email (optional)"
            />
            <Input
              label="Client Address"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Enter client address (optional)"
            />
            <Input
              label="Amount (JOD) *"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Enter amount"
            />
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

        {serviceType === 'subscription' && subscriptions.length === 0 && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            No active subscriptions found. Create a subscription first.
          </div>
        )}
      </form>
    </Modal>
  );
}
