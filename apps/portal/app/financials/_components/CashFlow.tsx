'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, DataTable, Badge, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { PlusIcon } from '@heroicons/react/24/outline';
import { CreateCashFlowEntryModal } from './CreateCashFlowEntryModal';
import { ExportCsvButton } from '../../_components/ActionButtons';

export function CashFlow() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const data = await financeApi.cashFlow.list(company?.id);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load cash flow data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const totalInflow = entries
    .filter(e => e.type === 'INFLOW')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOutflow = entries
    .filter(e => e.type === 'OUTFLOW')
    .reduce((sum, e) => sum + e.amount, 0);
  const netFlow = totalInflow - totalOutflow;

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
        <Badge variant={row.type === 'INFLOW' ? 'success' : 'danger'}>
          {row.type}
        </Badge>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      render: (row: any) => (
        <span className="text-textPrimary">{row.category || '—'}</span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      render: (row: any) => (
        <span className={`font-semibold ${row.type === 'INFLOW' ? 'text-success' : 'text-danger'}`}>
          {row.type === 'INFLOW' ? '+' : '-'}{row.currency} {row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'invoice',
      header: 'Related Invoice',
      render: (row: any) => (
        <span className="text-textPrimary">
          {row.relatedInvoice?.number || '—'}
        </span>
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
    return <div className="text-center py-12 text-textMuted">Loading cash flow data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-textMuted">Total Inflow</p>
            <p className="mt-2 text-2xl font-bold text-success">
              JD {totalInflow.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-textMuted">Total Outflow</p>
            <p className="mt-2 text-2xl font-bold text-danger">
              JD {totalOutflow.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-textMuted">Net Cash Flow</p>
            <p className={`mt-2 text-2xl font-bold ${netFlow >= 0 ? 'text-success' : 'text-danger'}`}>
              {netFlow >= 0 ? '+' : ''}JD {netFlow.toLocaleString()}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Cash Flow Entries</h3>
            <div className="flex gap-3">
              <ExportCsvButton
                rows={entries.map(e => ({
                  date: new Date(e.date).toLocaleDateString(),
                  type: e.type,
                  category: e.category || '',
                  amount: e.amount,
                  currency: e.currency,
                  invoice: e.relatedInvoice?.number || '',
                  description: e.description || '',
                }))}
                columns={['date', 'type', 'category', 'amount', 'currency', 'invoice', 'description']}
                filename="cash-flow-report.csv"
                label="Export"
              />
              <Button onClick={() => setShowModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
                Add Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={entries} />
        </CardBody>
      </Card>

      {/* Modal */}
      {showModal && (
        <CreateCashFlowEntryModal
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

