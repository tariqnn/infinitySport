'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, DataTable, Badge, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { PlusIcon } from '@heroicons/react/24/outline';
import { CreatePettyCashTransactionModal } from './CreatePettyCashTransactionModal';
import { ExportCsvButton } from '../../_components/ActionButtons';

export function PettyCash() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      if (!company) return;
      const data = await financeApi.pettyCash.list(company?.id);
      setTransactions(data);
    } catch (error) {
      console.warn('Failed to load petty cash data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate current balance
  const currentBalance = transactions.length > 0 
    ? transactions[0].balanceAfter 
    : 0;

  // Calculate totals
  const totalIssued = transactions
    .filter(t => t.type === 'ISSUE')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalReplenished = transactions
    .filter(t => t.type === 'REPLENISH')
    .reduce((sum, t) => sum + t.amount, 0);

  const columns = [
    {
      id: 'date',
      header: 'Date',
      render: (row: any) => (
        <span className="text-textPrimary">
          {new Date(row.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      render: (row: any) => (
        <Badge variant={row.type === 'REPLENISH' ? 'success' : 'warning'}>
          {row.type}
        </Badge>
      ),
    },
    {
      id: 'item',
      header: 'Item',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">{row.item}</span>
      ),
    },
    {
      id: 'staff',
      header: 'Staff',
      render: (row: any) => (
        <span className="text-textPrimary">{row.staff || '—'}</span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      render: (row: any) => (
        <span className={`font-semibold ${row.type === 'REPLENISH' ? 'text-success' : 'text-warning'}`}>
          {row.type === 'REPLENISH' ? '+' : '-'}{row.currency} {row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'balance',
      header: 'Balance After',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">
          {row.currency} {row.balanceAfter.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'reference',
      header: 'Reference',
      render: (row: any) => (
        <span className="text-textMuted">{row.reference || '—'}</span>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      render: (row: any) => (
        <span className="text-textMuted">{row.description || '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <button className="text-sm font-semibold text-primaryBlue hover:underline">
          Edit
        </button>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading petty cash data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-textMuted">Current Balance</p>
            <p className="mt-2 text-2xl font-bold text-textPrimary">
              JD {currentBalance.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-textMuted">Total Issued</p>
            <p className="mt-2 text-2xl font-bold text-warning">
              JD {totalIssued.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-textMuted">Total Replenished</p>
            <p className="mt-2 text-2xl font-bold text-success">
              JD {totalReplenished.toLocaleString()}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Petty Cash Transactions</h3>
            <div className="flex gap-3">
              <ExportCsvButton
                rows={transactions.map(t => ({
                  date: new Date(t.date).toLocaleDateString(),
                  type: t.type,
                  item: t.item,
                  staff: t.staff || '',
                  amount: t.amount,
                  currency: t.currency,
                  balanceAfter: t.balanceAfter,
                  reference: t.reference || '',
                  description: t.description || '',
                }))}
                columns={['date', 'type', 'item', 'staff', 'amount', 'currency', 'balanceAfter', 'reference', 'description']}
                filename="petty-cash-report.csv"
                label="Export Report"
              />
              <Button onClick={() => setShowModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
                Add Transaction
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={transactions} />
        </CardBody>
      </Card>

      {/* Modal */}
      {showModal && (
        <CreatePettyCashTransactionModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

