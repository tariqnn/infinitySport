'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, DataTable, Badge, Button, KPIStatCard } from '../../_components/ui';
import { financeApi, dashboardApi, getFirstCompany } from '../../../lib/portalApi';
import { ExportCsvButton } from '../../_components/ActionButtons';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { CreateInvoiceFromSubscriptionModal } from './CreateInvoiceFromSubscriptionModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { CurrencyDollarIcon, PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { DonutBreakdown, RevenueAreaChart } from '../../_components/PortalCharts';
import { getApiBaseUrl } from '../../../lib/getApiBaseUrl';

const API_BASE_URL = getApiBaseUrl();

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateFromSubscriptionModal, setShowCreateFromSubscriptionModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

  async function downloadInvoicePdf(row: any) {
    if (!row?.pdfPath) return;
    try {
      const pdfUrl = `${API_BASE_URL}${row.pdfPath}`;
      const res = await fetch(pdfUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to download invoice PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.number || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const [invs, dashboardStats] = await Promise.all([
        financeApi.invoices.list(company?.id),
        dashboardApi.stats(company?.id),
      ]);
      setInvoices(invs);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load invoice data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate metrics
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const monthlyRevenue = invoices
    .filter(i => new Date(i.issuedAt) >= currentMonth && i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);

  const outstandingInvoices = invoices.filter(i => 
    i.status === 'DRAFT' || i.status === 'SENT' || i.status === 'OVERDUE'
  );
  const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0);

  // Generate revenue data
  const revenueData = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.issuedAt);
      return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear() && inv.status === 'PAID';
    });
    const revenue = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    revenueData.push({
      month: months[date.getMonth()],
      revenue,
      expenses: Math.round(revenue * 0.5),
    });
  }

  const paymentMix = [
    { name: 'Visa / MasterCard', value: 55, color: '#1D48FF' },
    { name: 'Apple Pay', value: 22, color: '#29C461' },
    { name: 'Cash', value: 13, color: '#00A3A3' },
    { name: 'Wire', value: 10, color: '#6B7280' }
  ];

  const columns = [
    {
      id: 'number',
      header: 'Invoice #',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">{row.number}</span>
      ),
    },
    {
      id: 'member',
      header: 'Member / Company',
      render: (row: any) => (
        <span className="text-textPrimary">
          {row.member?.firstName && row.member?.lastName
            ? `${row.member.firstName} ${row.member.lastName}`
            : row.clientName || row.company?.name || 'N/A'}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">
          {row.currency} {row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      render: (row: any) => {
        if (!row.dueDate) return <span className="text-textMuted">—</span>;
        const dueDate = new Date(row.dueDate);
        const isOverdue = dueDate < new Date() && row.status !== 'PAID';
        return (
          <span className={isOverdue ? 'text-danger font-medium' : 'text-textPrimary'}>
            {dueDate.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: any) => {
        const dueDate = row.dueDate ? new Date(row.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && row.status !== 'PAID';
        const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
          PAID: { variant: 'success', label: 'Paid' },
          SENT: { variant: 'info', label: 'Sent' },
          DRAFT: { variant: 'neutral', label: 'Draft' },
          OVERDUE: { variant: 'danger', label: 'Overdue' },
        };
        const status = isOverdue
          ? { variant: 'danger' as const, label: 'Overdue' }
          : statusMap[row.status] || { variant: 'neutral' as const, label: row.status };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          {row.pdfPath && (
            <button
              onClick={() => downloadInvoicePdf(row)}
              className="text-sm font-semibold text-primaryBlue hover:underline"
            >
              Download
            </button>
          )}
          <button
            onClick={() => setEditingInvoice(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
          {row.status !== 'PAID' && (
            <button
              onClick={async () => {
                try {
                  await financeApi.invoices.update(row.id, { status: 'PAID', paidAt: new Date().toISOString() });
                  loadData();
                } catch (error) {
                  console.error('Failed to mark as paid:', error);
                }
              }}
              className="text-sm font-semibold text-success hover:underline"
            >
              Mark Paid
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          label="Monthly Revenue"
          value={`JD ${monthlyRevenue.toLocaleString()}`}
          caption="This month"
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          trend="up"
        />
        <KPIStatCard
          label="Outstanding"
          value={`JD ${outstandingAmount.toLocaleString()}`}
          caption={`${stats?.pendingInvoices || 0} invoices`}
          trend="down"
        />
        <KPIStatCard
          label="Pending Invoices"
          value={(stats?.pendingInvoices || 0).toString()}
          caption="Awaiting payment"
          trend="down"
        />
        <KPIStatCard
          label="Paid This Month"
          value={invoices.filter(i => i.status === 'PAID' && new Date(i.issuedAt).getMonth() === new Date().getMonth()).length.toString()}
          caption="Completed"
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-textPrimary">Revenue vs Expenses</h3>
            <RevenueAreaChart data={revenueData} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-4 text-lg font-semibold text-textPrimary">Payment Methods</h3>
            <DonutBreakdown data={paymentMix} />
          </CardBody>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Invoices</h3>
            <div className="flex gap-3">
              <ExportCsvButton
                rows={invoices.map(i => ({
                  number: i.number,
                  member: i.member ? `${i.member.firstName} ${i.member.lastName}` : 'N/A',
                  amount: i.amount,
                  currency: i.currency,
                  status: i.status,
                  issuedAt: new Date(i.issuedAt).toLocaleDateString(),
                  dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '',
                }))}
                columns={['number', 'member', 'amount', 'currency', 'status', 'issuedAt', 'dueDate']}
                filename="invoices-report.csv"
                label="Export"
              />
              <Button 
                onClick={() => setShowCreateFromSubscriptionModal(true)} 
                variant="secondary"
                leadingIcon={<DocumentTextIcon className="h-5 w-5" />}
              >
                From Subscription
              </Button>
              <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
                Create Invoice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={invoices} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateInvoiceModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {showCreateFromSubscriptionModal && (
        <CreateInvoiceFromSubscriptionModal
          open={showCreateFromSubscriptionModal}
          onClose={() => {
            setShowCreateFromSubscriptionModal(false);
            loadData();
          }}
        />
      )}

      {editingInvoice && (
        <EditInvoiceModal
          open={!!editingInvoice}
          invoice={editingInvoice}
          onClose={() => {
            setEditingInvoice(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

