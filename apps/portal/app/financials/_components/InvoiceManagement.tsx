'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, DataTable, Badge, Button, KPIStatCard } from '../../_components/ui';
import { financeApi, dashboardApi, getFirstCompany } from '../../../lib/portalApi';
import { ExportCsvButton } from '../../_components/ActionButtons';
import { CreateInvoiceFromSubscriptionModal } from './CreateInvoiceFromSubscriptionModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { ArrowDownTrayIcon, CurrencyDollarIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { DonutBreakdown, RevenueAreaChart } from '../../_components/PortalCharts';

function getInvoiceMeta(row: any): any | null {
  const desc = row?.description;
  if (!desc || typeof desc !== 'string') return null;
  try {
    const parsed = JSON.parse(desc);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showCreateFromSubscriptionModal, setShowCreateFromSubscriptionModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

  async function downloadInvoicePdf(row: any) {
    if (!row?.id) {
      alert('Cannot download: invoice ID is missing.');
      return;
    }
    try {
      const pdfUrl = financeApi.invoices.getPdfUrl(row.id);
      const res = await fetch(pdfUrl, { cache: 'no-store' });
      if (!res.ok) {
        alert('PDF not available for this invoice.');
        return;
      }
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
      alert('Failed to download invoice PDF.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      if (!company) return;
      const [invs, dashboardStats] = await Promise.all([
        financeApi.invoices.list(company?.id),
        dashboardApi.stats(company?.id),
      ]);
      setInvoices(invs);
      setStats(dashboardStats);
    } catch (error) {
      console.warn('Failed to load invoice data:', error);
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

  // Payment methods breakdown (live from invoices)
  const paymentMix = (() => {
    const totals = invoices.reduce(
      (acc, inv) => {
        const meta = getInvoiceMeta(inv);
        const method = ((inv.paymentMethod || meta?.paymentMethod || 'CARD') as 'CARD' | 'CASH');
        const amount = Number(inv.amount) || 0;
        if (method === 'CASH') acc.cash += amount;
        else acc.card += amount;
        return acc;
      },
      { card: 0, cash: 0 }
    );

    return [
      { name: 'Visa / MasterCard', value: totals.card, color: '#1D48FF' },
      { name: 'Cash', value: totals.cash, color: '#00A3A3' },
    ];
  })();

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={() => downloadInvoicePdf(row)}
          >
            Download
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditingInvoice(row)}
          >
            Edit
          </Button>
          {row.status !== 'PAID' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await financeApi.invoices.update(row.id, { status: 'PAID', paidAt: new Date().toISOString() });
                  loadData();
                } catch (error) {
                  console.error('Failed to mark as paid:', error);
                }
              }}
              className="text-success hover:bg-green-50"
            >
              Mark Paid
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            leadingIcon={<TrashIcon className="h-4 w-4" />}
            onClick={async () => {
              if (!confirm(`Delete invoice ${row.number}? This cannot be undone.`)) return;
              try {
                await financeApi.invoices.delete(row.id);
                loadData();
              } catch (error) {
                console.error('Failed to delete invoice', error);
                alert('Failed to delete invoice. It may be in use elsewhere.');
              }
            }}
          >
            Delete
          </Button>
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
                label="Export Report"
              />
              <Button onClick={() => setShowCreateFromSubscriptionModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
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

