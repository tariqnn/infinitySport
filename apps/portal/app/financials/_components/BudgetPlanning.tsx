'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, DataTable, Badge } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { CreateBudgetCategoryModal } from './CreateBudgetCategoryModal';
import { CreateBudgetEntryModal } from './CreateBudgetEntryModal';

export function BudgetPlanning() {
  const [categories, setCategories] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const [cats, ents] = await Promise.all([
        financeApi.budgetCategories.list(company?.id),
        financeApi.budgetEntries.list(company?.id),
      ]);
      setCategories(cats);
      setEntries(ents);
    } catch (error) {
      console.error('Failed to load budget data:', error);
    } finally {
      setLoading(false);
    }
  }

  const categoryColumns = [
    {
      id: 'name',
      header: 'Category',
      render: (row: any) => (
        <div>
          <p className="font-semibold text-textPrimary">{row.name}</p>
          {row.description && <p className="text-sm text-textMuted">{row.description}</p>}
        </div>
      ),
    },
    {
      id: 'budgets',
      header: 'Entries',
      render: (row: any) => (
        <span className="text-textPrimary">{row.budgets?.length || 0}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedCategory(row.id);
              setShowEntryModal(true);
            }}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Add Entry
          </button>
        </div>
      ),
    },
  ];

  const entryColumns = [
    {
      id: 'category',
      header: 'Category',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">{row.category?.name || 'N/A'}</span>
      ),
    },
    {
      id: 'period',
      header: 'Period',
      render: (row: any) => {
        const start = new Date(row.periodStart).toLocaleDateString();
        const end = new Date(row.periodEnd).toLocaleDateString();
        return <span className="text-textPrimary">{start} - {end}</span>;
      },
    },
    {
      id: 'planned',
      header: 'Planned',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">
          {row.currency} {row.plannedAmount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actual',
      header: 'Actual',
      render: (row: any) => (
        <span className="text-textPrimary">
          {row.currency} {row.actualAmount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'variance',
      header: 'Variance',
      render: (row: any) => {
        const variance = row.plannedAmount - row.actualAmount;
        const percent = row.plannedAmount > 0 ? ((variance / row.plannedAmount) * 100).toFixed(1) : 0;
        return (
          <span className={variance >= 0 ? 'text-success' : 'text-danger'}>
            {variance >= 0 ? '+' : ''}{row.currency} {variance.toLocaleString()} ({percent}%)
          </span>
        );
      },
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
    return <div className="text-center py-12 text-textMuted">Loading budget data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Budget Categories</h3>
            <Button onClick={() => setShowCategoryModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={categoryColumns} rows={categories} />
        </CardBody>
      </Card>

      {/* Entries Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Budget Entries</h3>
            <Button onClick={() => setShowEntryModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={entryColumns} rows={entries} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCategoryModal && (
        <CreateBudgetCategoryModal
          open={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            loadData();
          }}
        />
      )}

      {showEntryModal && (
        <CreateBudgetEntryModal
          open={showEntryModal}
          onClose={() => {
            setShowEntryModal(false);
            setSelectedCategory(null);
            loadData();
          }}
          categoryId={selectedCategory || undefined}
          categories={categories}
        />
      )}
    </div>
  );
}

