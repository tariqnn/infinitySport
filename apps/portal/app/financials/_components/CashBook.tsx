'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  FolderOpenIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, CardBody, CardHeader, DataTable, Badge, Input, Select, KPIStatCard } from '../../_components/ui';
import { ExportCsvButton } from '../../_components/ExportCsvButton';
import {
  financeApi,
  getFirstCompany,
  type CashBookCategoryRow,
  type CashBookTransactionRow,
  type CashBookTransactionType,
} from '../../../lib/portalApi';
import { CashBookTransactionModal } from './CashBookTransactionModal';
import { CashBookCategoriesModal } from './CashBookCategoriesModal';

type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom';
type TypeFilter = 'ALL' | CashBookTransactionType;

type MonthlySummaryRow = {
  label: string;
  income: number;
  expenses: number;
  net: number;
};

type CategoryBreakdownRow = {
  category: string;
  amount: number;
  share: number;
};

function formatCurrency(value: number): string {
  return `JD ${Math.abs(Math.round(value)).toLocaleString()}`;
}

function formatSignedCurrency(value: number): string {
  if (value === 0) return `JD 0`;
  return `${value > 0 ? '+' : '-'}${formatCurrency(value)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getStartOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getPresetRange(preset: Exclude<DatePreset, 'custom'>): { startDate: string; endDate: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (preset === 'all') {
    return { startDate: '', endDate: '' };
  }

  if (preset === 'today') {
    const value = toDateInputValue(now);
    return { startDate: value, endDate: value };
  }

  if (preset === 'week') {
    return {
      startDate: toDateInputValue(getStartOfWeek(now)),
      endDate: toDateInputValue(now),
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(now),
  };
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function CashBook() {
  const initialRange = useMemo(() => getPresetRange('month'), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CashBookCategoryRow[]>([]);
  const [transactions, setTransactions] = useState<CashBookTransactionRow[]>([]);
  const [allTransactions, setAllTransactions] = useState<CashBookTransactionRow[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashBookTransactionRow | null>(null);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      try {
        const company = await getFirstCompany();
        if (!company?.id) {
          throw new Error('No company found. Please create a company first.');
        }
        if (!cancelled) {
          setCompanyId(company.id);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load company.');
          setLoading(false);
        }
      }
    }

    void loadCompany();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const [categoryRows, filteredTransactions, fullTransactions] = await Promise.all([
        financeApi.cashBookCategories.list(companyId),
        financeApi.cashBookTransactions.list({
          companyId,
          type: typeFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search.trim() || undefined,
        }),
        financeApi.cashBookTransactions.list({ companyId }),
      ]);

      setCategories(categoryRows);
      setTransactions(filteredTransactions);
      setAllTransactions(fullTransactions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load cash book data.');
    } finally {
      setLoading(false);
    }
  }, [companyId, endDate, search, startDate, typeFilter]);

  useEffect(() => {
    if (!companyId) return;
    void loadData();
  }, [companyId, loadData]);

  const filteredIncome = useMemo(
    () => transactions.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0),
    [transactions],
  );
  const filteredExpenses = useMemo(
    () => transactions.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0),
    [transactions],
  );
  const filteredNet = filteredIncome - filteredExpenses;
  const currentBalance = useMemo(
    () =>
      allTransactions.reduce(
        (sum, row) => sum + (row.type === 'INCOME' ? row.amount : -row.amount),
        0,
      ),
    [allTransactions],
  );

  const runningBalanceById = useMemo(() => {
    const sorted = [...transactions].sort((left, right) => {
      const dateDiff = new Date(left.date).getTime() - new Date(right.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });

    let running = 0;
    const map: Record<string, number> = {};
    for (const row of sorted) {
      running += row.type === 'INCOME' ? row.amount : -row.amount;
      map[row.id] = running;
    }
    return map;
  }, [transactions]);

  const monthlySummary = useMemo<MonthlySummaryRow[]>(() => {
    const grouped = new Map<string, { income: number; expenses: number }>();

    for (const row of allTransactions) {
      const date = new Date(row.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = grouped.get(key) || { income: 0, expenses: 0 };
      if (row.type === 'INCOME') current.income += row.amount;
      else current.expenses += row.amount;
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .slice(0, 6)
      .map(([key, value]) => ({
        label: formatMonthLabel(key),
        income: value.income,
        expenses: value.expenses,
        net: value.income - value.expenses,
      }));
  }, [allTransactions]);

  const expenseBreakdown = useMemo<CategoryBreakdownRow[]>(() => {
    const grouped = new Map<string, number>();

    for (const row of transactions) {
      if (row.type !== 'EXPENSE') continue;
      grouped.set(row.categoryName, (grouped.get(row.categoryName) || 0) + row.amount);
    }

    const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);

    return Array.from(grouped.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([category, amount]) => ({
        category,
        amount,
        share: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  }, [transactions]);

  const currentFilterLabel = useMemo(() => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'week') return 'This week';
    if (datePreset === 'month') return 'This month';
    if (datePreset === 'all') return 'All time';
    if (startDate || endDate) {
      return `${startDate || 'Start'} to ${endDate || 'Now'}`;
    }
    return 'Custom range';
  }, [datePreset, endDate, startDate]);

  const transactionCsvRows = useMemo(
    () =>
      transactions.map((row) => ({
        Date: formatDate(row.date),
        Type: row.type,
        Category: row.categoryName,
        Note: row.note || '',
        Amount: row.amount,
        RunningBalance: runningBalanceById[row.id] ?? 0,
        Attachment: row.attachmentUrl || '',
      })),
    [runningBalanceById, transactions],
  );

  const reportCsvRows = useMemo(
    () => [
      ...monthlySummary.map((row) => ({
        Report: 'Monthly Summary',
        Label: row.label,
        Income: row.income,
        Expenses: row.expenses,
        Net: row.net,
        Share: '',
      })),
      ...expenseBreakdown.map((row) => ({
        Report: 'Expense Breakdown',
        Label: row.category,
        Income: '',
        Expenses: row.amount,
        Net: '',
        Share: `${row.share}%`,
      })),
    ],
    [expenseBreakdown, monthlySummary],
  );

  const transactionColumns = useMemo(
    () => [
      {
        id: 'date',
        header: 'Date',
        render: (row: CashBookTransactionRow) => <span className="text-ui-textPrimary">{formatDate(row.date)}</span>,
      },
      {
        id: 'type',
        header: 'Type',
        render: (row: CashBookTransactionRow) => (
          <Badge variant={row.type === 'INCOME' ? 'success' : 'danger'}>
            {row.type === 'INCOME' ? 'Income' : 'Expense'}
          </Badge>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        render: (row: CashBookTransactionRow) => <span className="font-semibold text-ui-textPrimary">{row.categoryName}</span>,
      },
      {
        id: 'note',
        header: 'Note',
        render: (row: CashBookTransactionRow) => (
          <span className="block max-w-[240px] truncate text-ui-textMuted" title={row.note || ''}>
            {row.note || '-'}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        render: (row: CashBookTransactionRow) => (
          <span className={clsx('font-semibold', row.type === 'INCOME' ? 'text-[#169a4f]' : 'text-[#b91c1c]')}>
            {row.type === 'INCOME' ? '+' : '-'}
            {formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        id: 'attachment',
        header: 'Attachment',
        render: (row: CashBookTransactionRow) =>
          row.attachmentUrl ? (
            <a
              href={row.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primaryBlue hover:underline"
            >
              <PaperClipIcon className="h-4 w-4" />
              View
            </a>
          ) : (
            <span className="text-ui-textMuted">-</span>
          ),
      },
      {
        id: 'runningBalance',
        header: 'Running Balance',
        render: (row: CashBookTransactionRow) => {
          const balance = runningBalanceById[row.id] ?? 0;
          return (
            <span className={clsx('font-semibold', balance >= 0 ? 'text-[#0b1f4f]' : 'text-[#b91c1c]')}>
              {balance < 0 ? '-' : ''}
              {formatCurrency(balance)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        render: (row: CashBookTransactionRow) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTransaction(row);
                setTransactionModalOpen(true);
              }}
              leadingIcon={<PencilSquareIcon className="h-4 w-4" />}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleDeleteTransaction(row)}
              leadingIcon={<TrashIcon className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [runningBalanceById],
  );

  async function handleDeleteTransaction(row: CashBookTransactionRow) {
    const confirmed = window.confirm(`Delete the ${row.type.toLowerCase()} transaction for ${formatCurrency(row.amount)}?`);
    if (!confirmed) return;

    try {
      await financeApi.cashBookTransactions.delete(row.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete transaction.');
    }
  }

  function handleRangePresetChange(nextPreset: Exclude<DatePreset, 'custom'>) {
    const range = getPresetRange(nextPreset);
    setDatePreset(nextPreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function handleExportPdf() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!printWindow) {
      window.alert('Please allow pop-ups to export the cash book report.');
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Cash Book Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
            h1, h2 { margin: 0 0 12px; }
            h1 { font-size: 28px; }
            h2 { font-size: 18px; margin-top: 28px; }
            p { margin: 0 0 10px; color: #475569; }
            .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0 28px; }
            .card { border: 1px solid #dbe3ef; border-radius: 14px; padding: 16px; }
            .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; }
            .value { font-size: 24px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #dbe3ef; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; color: #64748b; }
            .positive { color: #15803d; font-weight: 700; }
            .negative { color: #b91c1c; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Cash Book Report</h1>
          <p>Filter: ${escapeHtml(currentFilterLabel)}</p>
          <p>Exported: ${escapeHtml(new Date().toLocaleString())}</p>

          <div class="grid">
            <div class="card">
              <div class="label">Income</div>
              <div class="value positive">${escapeHtml(formatCurrency(filteredIncome))}</div>
            </div>
            <div class="card">
              <div class="label">Expenses</div>
              <div class="value negative">${escapeHtml(formatCurrency(filteredExpenses))}</div>
            </div>
            <div class="card">
              <div class="label">Current Balance</div>
              <div class="value ${currentBalance >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatSignedCurrency(currentBalance))}</div>
            </div>
            <div class="card">
              <div class="label">Net For Filter</div>
              <div class="value ${filteredNet >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatSignedCurrency(filteredNet))}</div>
            </div>
          </div>

          <h2>Monthly Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              ${monthlySummary
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.label)}</td>
                      <td class="positive">${escapeHtml(formatCurrency(row.income))}</td>
                      <td class="negative">${escapeHtml(formatCurrency(row.expenses))}</td>
                      <td class="${row.net >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatSignedCurrency(row.net))}</td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>

          <h2>Expense Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              ${expenseBreakdown
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.category)}</td>
                      <td class="negative">${escapeHtml(formatCurrency(row.amount))}</td>
                      <td>${escapeHtml(`${row.share}%`)}</td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>

          <h2>Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(formatDate(row.date))}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.categoryName)}</td>
                      <td>${escapeHtml(row.note || '-')}</td>
                      <td class="${row.type === 'INCOME' ? 'positive' : 'negative'}">
                        ${escapeHtml(`${row.type === 'INCOME' ? '+' : '-'}${formatCurrency(row.amount)}`)}
                      </td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (loading && !companyId) {
    return <div className="py-12 text-center text-ui-textMuted">Loading cash book...</div>;
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <KPIStatCard
          label="Income"
          value={formatCurrency(filteredIncome)}
          caption={currentFilterLabel}
          icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
          iconTone="green"
        />
        <KPIStatCard
          label="Expenses"
          value={formatCurrency(filteredExpenses)}
          caption={currentFilterLabel}
          icon={<ArrowTrendingDownIcon className="h-6 w-6" />}
          iconTone="red"
        />
        <KPIStatCard
          label="Current Balance"
          value={formatSignedCurrency(currentBalance)}
          caption="All transactions"
          icon={<WalletIcon className="h-6 w-6" />}
          iconTone={currentBalance >= 0 ? 'blue' : 'red'}
        />
        <KPIStatCard
          label="Net For Filter"
          value={formatSignedCurrency(filteredNet)}
          caption={`${transactions.length} transaction${transactions.length === 1 ? '' : 's'} shown`}
          icon={<FolderOpenIcon className="h-6 w-6" />}
          iconTone="slate"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ui-textPrimary">Cash book transactions</h3>
                <p className="text-sm text-ui-textMuted">Track daily income, expenses, attachments, and running balance.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ExportCsvButton
                  rows={transactionCsvRows}
                  columns={['Date', 'Type', 'Category', 'Note', 'Amount', 'RunningBalance', 'Attachment']}
                  filename="cash-book-transactions.csv"
                  label="Export CSV"
                  prefixLines={[`Filter: ${currentFilterLabel}`, `Type: ${typeFilter}`, `Search: ${search.trim() || 'All'}`]}
                />
                <ExportCsvButton
                  rows={reportCsvRows}
                  columns={['Report', 'Label', 'Income', 'Expenses', 'Net', 'Share']}
                  filename="cash-book-reports.csv"
                  label="Reports CSV"
                />
                <Button type="button" variant="secondary" onClick={handleExportPdf} leadingIcon={<ArrowDownTrayIcon className="h-5 w-5" />}>
                  Export PDF
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCategoriesModalOpen(true)}>
                  Manage categories
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setTransactionModalOpen(true);
                  }}
                  leadingIcon={<PlusIcon className="h-5 w-5" />}
                >
                  Add transaction
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-ui-border bg-ui-softBg/30 p-4">
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This week' },
                  { id: 'month', label: 'This month' },
                  { id: 'all', label: 'All time' },
                  { id: 'custom', label: 'Custom' },
                ] as { id: DatePreset; label: string }[]).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (preset.id === 'custom') {
                        setDatePreset('custom');
                        return;
                      }
                      handleRangePresetChange(preset.id);
                    }}
                    className={clsx(
                      'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                      datePreset === preset.id
                        ? 'border-[#0a1d45] bg-[#0b1f4f] text-white'
                        : 'border-ui-border bg-white text-ui-textPrimary hover:bg-[#f8fafc]',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
                <Input
                  label="Search note or category"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transactions"
                />
                <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
                  <option value="ALL">All</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </Select>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  <Input
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setDatePreset('custom');
                      setStartDate(e.target.value);
                    }}
                  />
                  <Input
                    label="End date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDatePreset('custom');
                      setEndDate(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="px-6 py-12 text-center text-ui-textMuted">Loading transactions...</div>
          ) : (
            <DataTable columns={transactionColumns} rows={transactions} />
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold text-ui-textPrimary">Monthly summary</h3>
              <p className="text-sm text-ui-textMuted">Last 6 months across all cash book transactions.</p>
            </div>
          </CardHeader>
          <CardBody>
            {monthlySummary.length === 0 ? (
              <p className="text-ui-textMuted">No transaction history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr className="border-b border-ui-border text-left text-ui-textMuted">
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-[0.08em]">Month</th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-[0.08em]">Income</th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-[0.08em]">Expenses</th>
                      <th className="pb-3 font-semibold uppercase tracking-[0.08em]">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.map((row) => (
                      <tr key={row.label} className="border-b border-ui-border/80">
                        <td className="py-3 pr-4 font-semibold text-ui-textPrimary">{row.label}</td>
                        <td className="py-3 pr-4 font-semibold text-[#169a4f]">{formatCurrency(row.income)}</td>
                        <td className="py-3 pr-4 font-semibold text-[#b91c1c]">{formatCurrency(row.expenses)}</td>
                        <td className={clsx('py-3 font-semibold', row.net >= 0 ? 'text-[#0b1f4f]' : 'text-[#b91c1c]')}>
                          {formatSignedCurrency(row.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold text-ui-textPrimary">Expense breakdown</h3>
              <p className="text-sm text-ui-textMuted">Category totals for the current filter.</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {expenseBreakdown.length === 0 ? (
              <p className="text-ui-textMuted">No expense transactions in the selected range.</p>
            ) : (
              expenseBreakdown.map((row) => (
                <div key={row.category} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ui-textPrimary">{row.category}</p>
                      <p className="text-sm text-ui-textMuted">{row.share}% of filtered expenses</p>
                    </div>
                    <p className="font-semibold text-[#b91c1c]">{formatCurrency(row.amount)}</p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-ui-softBg">
                    <div
                      className="h-full rounded-full bg-[#dc2626]"
                      style={{ width: `${Math.max(row.share, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {companyId ? (
        <>
          <CashBookTransactionModal
            open={transactionModalOpen}
            onClose={() => {
              setTransactionModalOpen(false);
              setEditingTransaction(null);
            }}
            onSaved={() => {
              void loadData();
            }}
            companyId={companyId}
            categories={categories}
            transaction={editingTransaction}
          />

          <CashBookCategoriesModal
            open={categoriesModalOpen}
            onClose={() => setCategoriesModalOpen(false)}
            onSaved={() => {
              void loadData();
            }}
            companyId={companyId}
            categories={categories}
          />
        </>
      ) : null}
    </div>
  );
}
