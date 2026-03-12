'use client';

import { useState } from 'react';
import { Modal, Select, Input, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';
import { INVOICE_CONFIG } from '../../../lib/invoiceConfig';
import { downloadInvoicePdf, type InvoiceCreateResult } from './invoiceUtils';

type ServiceType = 'basketball' | 'padel' | 'court-booking' | 'gym' | 'gymnastics';

export function CreateInvoiceFromSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('basketball');
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!clientName.trim()) {
      setError('Please enter client name');
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    const company = await getFirstCompany();
    
    if (!company || !company.id) {
      setError('Company not found. The system tried to create "Infinity Sporty" but failed. Please check database connectivity or create a company manually in settings.');
      setLoading(false);
      return;
    }

    try {
      // Service type invoices (basketball, padel, court-booking, gym, gymnastics)
      const serviceNames: Record<ServiceType, string> = {
        'basketball': 'Basketball Subscription',
        'padel': 'Padel Subscription',
        'court-booking': 'Court Booking',
        'gym': 'Gym Membership',
        'gymnastics': 'Gymnastics Subscription',
      };

      const serviceName = serviceNames[serviceType];
      const invoiceAmount = Math.round(Number(amount)); // Amount in JOD (stored as int, but represents JOD)

      const invoiceData = {
        amount: invoiceAmount,
        currency: 'JOD',
        status: 'DRAFT',
        paymentMethod,
        issuedAt: new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,

        // Company relation
        company: { connect: { id: company.id } },

        // Enterprise invoice fields
        companyName: INVOICE_CONFIG.companyName,
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

      const created = (await financeApi.invoices.create(invoiceData)) as InvoiceCreateResult;

      await downloadInvoicePdf(created);

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice from subscription');
    } finally {
      setLoading(false);
    }
  }


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
            disabled={!clientName.trim() || !amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0}
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
          onChange={(e) => setServiceType(e.target.value as ServiceType)}
          required
          options={[
            { value: 'basketball', label: 'Basketball Subscription' },
            { value: 'padel', label: 'Padel Subscription' },
            { value: 'court-booking', label: 'Court Booking' },
            { value: 'gym', label: 'Gym Membership' },
            { value: 'gymnastics', label: 'Gymnastics Subscription' },
          ]}
        />

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
      </form>
    </Modal>
  );
}

