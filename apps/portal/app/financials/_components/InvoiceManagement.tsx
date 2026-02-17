'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, DataTable, Badge, Button, KPIStatCard, Select, Input } from '../../_components/ui';
import { financeApi, dashboardApi, getFirstCompany } from '../../../lib/portalApi';
import { ExportCsvButton } from '../../_components/ActionButtons';
import { CreateInvoiceModal } from './CreateInvoiceModal';
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
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  async function downloadInvoicePdf(row: any) {
    if (!row?.id) {
      alert('Cannot download: invoice ID is missing.');
      return;
    }
    try {
      const pdfUrl = financeApi.invoices.getPdfUrl(row.id);
      console.log('Downloading invoice PDF from:', pdfUrl);
      const res = await fetch(pdfUrl, { cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.error('Invoice PDF download failed:', res.status, errorText);
        const msg =
          res.status === 404
            ? 'Invoice not found.'
            : res.status === 500
            ? 'Server error generating PDF. Please check the API logs.'
            : `PDF could not be generated (${res.status}). Please try again.`;
        alert(msg);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('pdf')) {
        console.error('Response is not a PDF:', contentType);
        alert('Server returned invalid content. Expected PDF but got: ' + contentType);
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
      console.error('Invoice PDF download error:', e);
      alert('Failed to download invoice PDF. Please ensure the API server is running and try again.');
    }
  }

  useEffect(() => {
    loadData();
  }, [dateRange, customStartDate, customEndDate]);

  function getDateRange(): { startDate?: string; endDate?: string } {
    if (dateRange === 'all') {
      return {};
    }
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (dateRange === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }
    
    const start = new Date();
    if (dateRange === '1week') {
      start.setDate(today.getDate() - 7);
    } else if (dateRange === '1month') {
      start.setMonth(today.getMonth() - 1);
    } else if (dateRange === '3months') {
      start.setMonth(today.getMonth() - 3);
    } else if (dateRange === '6months') {
      start.setMonth(today.getMonth() - 6);
    } else if (dateRange === '1year') {
      start.setFullYear(today.getFullYear() - 1);
    }
    start.setHours(0, 0, 0, 0);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  }

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      if (!company) return;
      
      const dateFilters = getDateRange();
      const [invs, dashboardStats] = await Promise.all([
        financeApi.invoices.list(company?.id, undefined, dateFilters.startDate, dateFilters.endDate),
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
      render: (row: any) => {
        const amountPaid = row.amountPaid || 0;
        const total = row.amount || 0;
        const remaining = total - amountPaid;
        return (
          <div className="space-y-1">
            <span className="font-semibold text-textPrimary">
              {row.currency} {total.toLocaleString()}
            </span>
            {amountPaid > 0 && (
              <div className="text-xs text-textMuted">
                Paid: {row.currency} {amountPaid.toLocaleString()} | Remaining: {row.currency} {remaining.toLocaleString()}
              </div>
            )}
          </div>
        );
      },
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
          PARTIALLY_PAID: { variant: 'warning', label: 'Partially Paid' },
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Invoices</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="min-w-[150px]"
                >
                  <option value="all">All Time</option>
                  <option value="1week">Last 7 Days</option>
                  <option value="1month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </Select>
                {dateRange === 'custom' && (
                  <>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="Start Date"
                      className="min-w-[140px]"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="End Date"
                      className="min-w-[140px]"
                    />
                  </>
                )}
              </div>
              <ExportCsvButton
                rows={invoices.map(i => {
                  const issuedAt = new Date(i.issuedAt);
                  const dueDate = i.dueDate ? new Date(i.dueDate) : null;
                  
                  // Format dates for Excel compatibility (MM/DD/YYYY format)
                  const formatDateForExcel = (date: Date) => {
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${month}/${day}/${year}`;
                  };
                  
                  // Format time for Excel (HH:MM:SS)
                  const formatTimeForExcel = (date: Date) => {
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    return `${hours}:${minutes}:${seconds}`;
                  };
                  
                  // Format date-time for Excel (MM/DD/YYYY HH:MM:SS)
                  const formatDateTimeForExcel = (date: Date) => {
                    return `${formatDateForExcel(date)} ${formatTimeForExcel(date)}`;
                  };
                  
                  return {
                    number: i.number || '',
                    member: i.member ? `${i.member.firstName} ${i.member.lastName}` : 'N/A',
                    amount: i.amount || 0,
                    currency: i.currency || 'JOD',
                    status: i.status || '',
                    issuedDate: formatDateForExcel(issuedAt),
                    issuedTime: formatTimeForExcel(issuedAt),
                    issuedDateTime: formatDateTimeForExcel(issuedAt),
                    dueDate: dueDate ? formatDateForExcel(dueDate) : '',
                    amountPaid: i.amountPaid || 0,
                    remaining: (i.amount || 0) - (i.amountPaid || 0),
                  };
                })}
                columns={['number', 'member', 'amount', 'currency', 'status', 'issuedDate', 'issuedTime', 'issuedDateTime', 'dueDate', 'amountPaid', 'remaining']}
                filename={`invoices-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`}
                label="Export Report"
              />
              <Button onClick={() => setShowCreateInvoiceModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
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
      {showCreateInvoiceModal && (
        <CreateInvoiceModal
          open={showCreateInvoiceModal}
          onClose={() => {
            setShowCreateInvoiceModal(false);
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

