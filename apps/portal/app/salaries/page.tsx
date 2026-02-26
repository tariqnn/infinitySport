'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  DataTable,
  Input,
  Select,
  KPIStatCard,
  Modal,
  PageHeader,
  Textarea,
} from '../_components/ui';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

type SalaryStatus = 'Draft' | 'Pending' | 'Approved' | 'Paid';
type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Wallet';

type SalaryRow = {
  id: string;
  employeeName: string;
  email: string;
  employeeCode: string;
  position: string;
  department: string;
  month: string;
  periodLabel: string;
  gross: number;
  deductions: number;
  netSalary: number;
  status: SalaryStatus;
  paymentMethod: PaymentMethod;
  payDate?: string;
  notes?: string;
};

type SalaryFormState = {
  employeeName: string;
  email: string;
  employeeCode: string;
  position: string;
  department: string;
  month: string;
  gross: string;
  deductions: string;
  status: SalaryStatus;
  paymentMethod: PaymentMethod;
  payDate: string;
  notes: string;
};

const PAGE_SIZE = 4;

const INITIAL_SALARIES: SalaryRow[] = [
  {
    id: 'SAL-2301',
    employeeName: 'Julianna S. Thorne',
    email: 'julianna.t@infinity.com',
    employeeCode: 'EMP-2101',
    position: 'Head Coach',
    department: 'Head Coach',
    month: '2023-10',
    periodLabel: 'Oct 1 - Oct 31',
    gross: 8500,
    deductions: 1240,
    netSalary: 7260,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    payDate: '2023-10-31',
  },
  {
    id: 'SAL-2302',
    employeeName: 'Marcus K. Sterling',
    email: 'm.sterling@infinity.com',
    employeeCode: 'EMP-1984',
    position: 'Logistics Manager',
    department: 'Logistics',
    month: '2023-10',
    periodLabel: 'Oct 1 - Oct 31',
    gross: 5200,
    deductions: 640,
    netSalary: 4560,
    status: 'Pending',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'SAL-2303',
    employeeName: 'Eleanor Woods',
    email: 'e.woods@infinity.com',
    employeeCode: 'EMP-1150',
    position: 'Marketing Specialist',
    department: 'Marketing',
    month: '2023-10',
    periodLabel: 'Oct 1 - Oct 31',
    gross: 6800,
    deductions: 980,
    netSalary: 5820,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    payDate: '2023-10-31',
  },
  {
    id: 'SAL-2304',
    employeeName: 'David L. Rossi',
    email: 'd.rossi@infinity.com',
    employeeCode: 'EMP-1240',
    position: 'Financial Analyst',
    department: 'Financial Analyst',
    month: '2023-10',
    periodLabel: 'Oct 1 - Oct 31',
    gross: 7200,
    deductions: 1100,
    netSalary: 6100,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    payDate: '2023-10-31',
  },
  {
    id: 'SAL-2305',
    employeeName: 'Maya Fletcher',
    email: 'maya.f@infinity.com',
    employeeCode: 'EMP-1521',
    position: 'Assistant Coach',
    department: 'Coaching',
    month: '2023-09',
    periodLabel: 'Sep 1 - Sep 30',
    gross: 4100,
    deductions: 340,
    netSalary: 3760,
    status: 'Approved',
    paymentMethod: 'Cash',
  },
  {
    id: 'SAL-2306',
    employeeName: 'Rami Haddad',
    email: 'rami.h@infinity.com',
    employeeCode: 'EMP-1941',
    position: 'Operations Specialist',
    department: 'Operations',
    month: '2023-09',
    periodLabel: 'Sep 1 - Sep 30',
    gross: 3950,
    deductions: 420,
    netSalary: 3530,
    status: 'Draft',
    paymentMethod: 'Wallet',
  },
];

const DEFAULT_FORM: SalaryFormState = {
  employeeName: '',
  email: '',
  employeeCode: '',
  position: '',
  department: '',
  month: '2023-10',
  gross: '0',
  deductions: '0',
  status: 'Draft',
  paymentMethod: 'Bank Transfer',
  payDate: '',
  notes: '',
};

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMonth(month: string): string {
  if (!month) return '-';
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function statusTone(status: SalaryStatus): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'Paid') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Approved') return 'info';
  return 'neutral';
}

export default function SalariesPage() {
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>(INITIAL_SALARIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SalaryStatus>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('2023-10');
  const [page, setPage] = useState(1);

  const [showEditor, setShowEditor] = useState(false);
  const [showRunPayroll, setShowRunPayroll] = useState(false);
  const [detailsRow, setDetailsRow] = useState<SalaryRow | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SalaryFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');

  const [payrollMonth, setPayrollMonth] = useState('2023-10');
  const [payrollDate, setPayrollDate] = useState('');
  const [payrollMethod, setPayrollMethod] = useState<PaymentMethod>('Bank Transfer');
  const [includeDraft, setIncludeDraft] = useState(false);

  const departments = useMemo(() => {
    return Array.from(new Set(salaryRows.map((row) => row.department))).sort((a, b) => a.localeCompare(b));
  }, [salaryRows]);

  const months = useMemo(() => {
    return Array.from(new Set(salaryRows.map((row) => row.month))).sort((a, b) => b.localeCompare(a));
  }, [salaryRows]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return salaryRows.filter((row) => {
      const matchesSearch =
        !term ||
        row.employeeName.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term) ||
        row.position.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || row.department === departmentFilter;
      const matchesMonth = monthFilter === 'all' || row.month === monthFilter;

      return matchesSearch && matchesStatus && matchesDepartment && matchesMonth;
    });
  }, [departmentFilter, monthFilter, salaryRows, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const kpiTotals = useMemo(() => {
    const net = filteredRows.reduce((total, row) => total + row.netSalary, 0);
    const pending = filteredRows
      .filter((row) => row.status === 'Pending' || row.status === 'Approved')
      .reduce((total, row) => total + row.netSalary, 0);
    const paidEmployees = filteredRows.filter((row) => row.status === 'Paid').length;
    const avgNet = filteredRows.length > 0 ? net / filteredRows.length : 0;

    return { net, pending, paidEmployees, avgNet };
  }, [filteredRows]);

  const paidProgress = useMemo(() => {
    if (filteredRows.length === 0) return 0;
    return Math.round((filteredRows.filter((row) => row.status === 'Paid').length / filteredRows.length) * 100);
  }, [filteredRows]);

  const payrollCandidates = useMemo(() => {
    return salaryRows.filter((row) => {
      if (row.month !== payrollMonth) return false;
      if (row.status === 'Paid') return false;
      if (!includeDraft && row.status === 'Draft') return false;
      return row.status === 'Pending' || row.status === 'Approved' || (includeDraft && row.status === 'Draft');
    });
  }, [includeDraft, payrollMonth, salaryRows]);

  const payrollTotal = useMemo(() => {
    return payrollCandidates.reduce((total, row) => total + row.netSalary, 0);
  }, [payrollCandidates]);

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, month: monthFilter === 'all' ? '2023-10' : monthFilter });
    setFormError('');
    setShowEditor(true);
  }

  function openEditModal(row: SalaryRow) {
    setEditingId(row.id);
    setForm({
      employeeName: row.employeeName,
      email: row.email,
      employeeCode: row.employeeCode,
      position: row.position,
      department: row.department,
      month: row.month,
      gross: String(row.gross),
      deductions: String(row.deductions),
      status: row.status,
      paymentMethod: row.paymentMethod,
      payDate: row.payDate || '',
      notes: row.notes || '',
    });
    setFormError('');
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError('');
  }

  function saveSalaryRow() {
    if (!form.employeeName.trim() || !form.department.trim() || !form.position.trim() || !form.month.trim()) {
      setFormError('Employee name, department, position, and month are required.');
      return;
    }

    const gross = parseAmount(form.gross);
    const deductions = parseAmount(form.deductions);
    const netSalary = gross - deductions;

    if (netSalary < 0) {
      setFormError('Net salary cannot be negative.');
      return;
    }

    const payload: SalaryRow = {
      id: editingId || `SAL-${Date.now()}`,
      employeeName: form.employeeName.trim(),
      email: form.email.trim() || `${form.employeeName.trim().toLowerCase().replace(/\s+/g, '.')}@infinity.com`,
      employeeCode: form.employeeCode.trim() || 'EMP-NEW',
      position: form.position.trim(),
      department: form.department.trim(),
      month: form.month,
      periodLabel: `${formatMonth(form.month)} payroll`,
      gross,
      deductions,
      netSalary,
      status: form.status,
      paymentMethod: form.paymentMethod,
      payDate: form.payDate || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSalaryRows((prev) => {
      if (!editingId) return [payload, ...prev];
      return prev.map((row) => (row.id === editingId ? payload : row));
    });

    closeEditor();
  }

  function runPayrollUi() {
    if (!payrollDate) return;

    const candidateIds = new Set(payrollCandidates.map((row) => row.id));
    setSalaryRows((prev) =>
      prev.map((row) => {
        if (!candidateIds.has(row.id)) return row;
        return {
          ...row,
          status: 'Paid',
          payDate: payrollDate,
          paymentMethod: payrollMethod,
          notes: row.notes || 'Payroll executed from salaries module.',
        };
      })
    );

    setShowRunPayroll(false);
  }

  const columns = [
    {
      id: 'employee',
      header: 'Employee',
      render: (row: SalaryRow) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2ff] text-xs font-semibold text-[#294cce]">
            {getInitials(row.employeeName)}
          </div>
          <div>
            <p className="font-semibold text-ui-textPrimary">{row.employeeName}</p>
            <p className="text-xs text-ui-textMuted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      render: (row: SalaryRow) => <span className="text-sm text-ui-textPrimary">{row.department}</span>,
    },
    {
      id: 'period',
      header: 'Period',
      render: (row: SalaryRow) => <span className="text-sm text-ui-textPrimary">{row.periodLabel}</span>,
    },
    {
      id: 'gross',
      header: 'Gross',
      render: (row: SalaryRow) => <span className="font-medium text-ui-textPrimary">{formatCurrency(row.gross)}</span>,
    },
    {
      id: 'deductions',
      header: 'Deductions',
      render: (row: SalaryRow) => <span className="font-medium text-[#ef4444]">-{formatCurrency(row.deductions)}</span>,
    },
    {
      id: 'net',
      header: 'Net Salary',
      render: (row: SalaryRow) => <span className="font-semibold text-[#0f172a]">{formatCurrency(row.netSalary)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: SalaryRow) => <Badge variant={statusTone(row.status)}>{row.status}</Badge>,
    },
  ];

  const startIndex = filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, filteredRows.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salaries"
        subtitle="Manage and audit employee payroll for the current fiscal period."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowRunPayroll(true)} leadingIcon={<ArrowPathIcon className="h-4 w-4" />}>
              Run Payroll
            </Button>
            <Button onClick={openCreateModal} leadingIcon={<PlusIcon className="h-4 w-4" />}>
              Add Entry
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard
          label="Total Net"
          value={formatCurrency(kpiTotals.net)}
          caption="+4.2% vs last month"
          trend="up"
          icon={<BanknotesIcon className="h-4 w-4" />}
          iconTone="blue"
        />
        <KPIStatCard
          label="Pending"
          value={formatCurrency(kpiTotals.pending)}
          caption={`${filteredRows.filter((row) => row.status !== 'Paid').length} entries awaiting approval`}
          icon={<ClockIcon className="h-4 w-4" />}
          iconTone="amber"
        />
        <KPIStatCard
          label="Paid Employees"
          value={String(kpiTotals.paidEmployees)}
          caption={`${paidProgress}% completion rate`}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          iconTone="green"
        />
        <KPIStatCard
          label="Avg Net"
          value={formatCurrency(kpiTotals.avgNet)}
          caption="Market Competitive Rate"
          icon={<UserGroupIcon className="h-4 w-4" />}
          iconTone="slate"
        />
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-[2.4fr,0.9fr,0.9fr,1fr,44px]">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-textMuted" />
              <input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-ui-border bg-white pl-9 pr-3 text-sm text-ui-textPrimary placeholder:text-ui-textMuted focus:border-brand-primaryBlue/30 focus:outline-none"
              />
            </div>

            <select
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-ui-border bg-white px-3 text-sm text-ui-textPrimary focus:border-brand-primaryBlue/30 focus:outline-none"
            >
              <option value="all">All Months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | SalaryStatus);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-ui-border bg-white px-3 text-sm text-ui-textPrimary focus:border-brand-primaryBlue/30 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-ui-border bg-white px-3 text-sm text-ui-textPrimary focus:border-brand-primaryBlue/30 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="inline-flex h-10 w-11 items-center justify-center rounded-lg border border-ui-border bg-white text-ui-textMuted transition hover:bg-[#f8fafc]"
              aria-label="Advanced filters"
            >
              <FunnelIcon className="h-4 w-4" />
            </button>
          </div>

          <DataTable columns={columns} rows={pagedRows} onRowClick={(row) => setDetailsRow(row)} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ui-textMuted">
              Showing {startIndex} to {endIndex} of {filteredRows.length} entries
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-white text-ui-textMuted disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold ${
                    page === pageNumber
                      ? 'border-[#0a1d45] bg-[#0b1f4f] text-white'
                      : 'border-ui-border bg-white text-ui-textPrimary'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-white text-ui-textMuted disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={showEditor}
        onClose={closeEditor}
        size="xl"
        title={editingId ? 'Edit Salary Entry' : 'Create Salary Entry'}
        description="Update payroll fields then save the salary record."
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
            <Button onClick={saveSalaryRow}>{editingId ? 'Save Changes' : 'Create Entry'}</Button>
          </>
        }
      >
        <div className="space-y-5">
          {formError ? (
            <div className="rounded-lg border border-ui-danger/30 bg-red-50 px-3 py-2 text-sm text-ui-danger">{formError}</div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Employee Name"
              value={form.employeeName}
              onChange={(event) => setForm((current) => ({ ...current, employeeName: event.target.value }))}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              label="Employee Code"
              value={form.employeeCode}
              onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))}
            />
            <Input
              label="Position"
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
              required
            />
            <Input
              label="Department"
              value={form.department}
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              required
            />
            <Input
              label="Month"
              type="month"
              value={form.month}
              onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Gross"
              type="number"
              min="0"
              step="0.01"
              value={form.gross}
              onChange={(event) => setForm((current) => ({ ...current, gross: event.target.value }))}
            />
            <Input
              label="Deductions"
              type="number"
              min="0"
              step="0.01"
              value={form.deductions}
              onChange={(event) => setForm((current) => ({ ...current, deductions: event.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SalaryStatus }))}
            >
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
            </Select>
            <Select
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Wallet">Wallet</option>
            </Select>
          </div>

          <Input
            label="Payment Date"
            type="date"
            value={form.payDate}
            onChange={(event) => setForm((current) => ({ ...current, payDate: event.target.value }))}
          />

          <Textarea
            label="Notes"
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />

          <div className="rounded-lg border border-ui-border bg-ui-softBg px-4 py-3 text-sm text-ui-textPrimary">
            Net Salary Preview:{' '}
            <span className="font-semibold">{formatCurrency(parseAmount(form.gross) - parseAmount(form.deductions))}</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRunPayroll}
        onClose={() => setShowRunPayroll(false)}
        size="lg"
        title="Run Payroll"
        description="Mark approved/pending records as paid for the selected period."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRunPayroll(false)}>
              Cancel
            </Button>
            <Button onClick={runPayrollUi} disabled={!payrollDate || payrollCandidates.length === 0}>
              Execute Payroll
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Payroll Month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)}>
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </Select>
            <Input
              label="Payment Date"
              type="date"
              value={payrollDate}
              onChange={(event) => setPayrollDate(event.target.value)}
            />
            <Select
              label="Payment Method"
              value={payrollMethod}
              onChange={(event) => setPayrollMethod(event.target.value as PaymentMethod)}
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Wallet">Wallet</option>
            </Select>
            <label className="mt-7 inline-flex items-center gap-2 text-sm text-ui-textPrimary">
              <input
                type="checkbox"
                checked={includeDraft}
                onChange={(event) => setIncludeDraft(event.target.checked)}
                className="h-4 w-4 rounded border-ui-border text-brand-primaryBlue focus:ring-brand-primaryBlue/20"
              />
              Include draft salary entries
            </label>
          </div>

          <div className="rounded-lg border border-ui-border bg-ui-softBg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ui-textPrimary">Payroll Preview</p>
              <p className="text-sm font-semibold text-ui-textPrimary">{formatCurrency(payrollTotal)}</p>
            </div>
            <p className="mt-1 text-xs text-ui-textMuted">{payrollCandidates.length} records will be marked as paid.</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailsRow}
        onClose={() => setDetailsRow(null)}
        size="lg"
        title="Salary Details"
        description={detailsRow ? `${detailsRow.employeeName} - ${formatMonth(detailsRow.month)}` : 'Salary details'}
        footer={
          detailsRow ? (
            <>
              <Button variant="ghost" onClick={() => setDetailsRow(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  openEditModal(detailsRow);
                  setDetailsRow(null);
                }}
              >
                Edit Salary
              </Button>
            </>
          ) : null
        }
      >
        {detailsRow ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-ui-border bg-ui-softBg p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-ui-textMuted">Employee</p>
                <p className="mt-1 font-semibold text-ui-textPrimary">{detailsRow.employeeName}</p>
                <p className="text-xs text-ui-textMuted">{detailsRow.email}</p>
                <p className="text-xs text-ui-textMuted">{detailsRow.employeeCode} - {detailsRow.position}</p>
              </div>
              <div className="rounded-lg border border-ui-border bg-ui-softBg p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-ui-textMuted">Payment</p>
                <div className="mt-1">
                  <Badge variant={statusTone(detailsRow.status)}>{detailsRow.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-ui-textMuted">Method: {detailsRow.paymentMethod}</p>
                <p className="text-xs text-ui-textMuted">Date: {detailsRow.payDate || 'Not paid yet'}</p>
              </div>
            </div>

            <div className="rounded-lg border border-ui-border">
              <div className="border-b border-ui-border bg-ui-softBg px-3 py-2 text-sm font-semibold text-ui-textPrimary">Breakdown</div>
              <div className="space-y-2 px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-ui-textMuted">Gross</span>
                  <span className="font-medium text-ui-textPrimary">{formatCurrency(detailsRow.gross)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-textMuted">Deductions</span>
                  <span className="font-medium text-[#ef4444]">-{formatCurrency(detailsRow.deductions)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-ui-border pt-2">
                  <span className="font-semibold text-ui-textPrimary">Net Salary</span>
                  <span className="font-semibold text-ui-textPrimary">{formatCurrency(detailsRow.netSalary)}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-ui-textMuted">Notes</p>
              <p className="mt-1 text-ui-textPrimary">{detailsRow.notes || 'No notes added.'}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
