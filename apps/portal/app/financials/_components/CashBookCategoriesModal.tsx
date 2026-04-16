'use client';

import { useMemo, useState } from 'react';
import { Modal, Input, Select, Button, Badge } from '../../_components/ui';
import {
  financeApi,
  type CashBookCategoryRow,
  type CashBookTransactionType,
} from '../../../lib/portalApi';
import { TrashIcon } from '@heroicons/react/24/outline';

function groupLabel(type: CashBookTransactionType): string {
  return type === 'INCOME' ? 'Income categories' : 'Expense categories';
}

export function CashBookCategoriesModal({
  open,
  onClose,
  onSaved,
  companyId,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  categories: CashBookCategoryRow[];
}) {
  const [type, setType] = useState<CashBookTransactionType>('EXPENSE');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () => ({
      INCOME: categories
        .filter((row) => row.type === 'INCOME')
        .sort((left, right) => left.name.localeCompare(right.name)),
      EXPENSE: categories
        .filter((row) => row.type === 'EXPENSE')
        .sort((left, right) => left.name.localeCompare(right.name)),
    }),
    [categories],
  );

  async function handleAddCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Category name is required.');

      await financeApi.cashBookCategories.create({
        companyId,
        type,
        name: trimmed,
      });

      setName('');
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(category: CashBookCategoryRow) {
    const transactionCount = category._count?.transactions ?? 0;
    const confirmed = window.confirm(
      transactionCount > 0
        ? `Delete "${category.name}"? Existing transactions will keep their saved category name, but this category will be removed from future use.`
        : `Delete "${category.name}"?`,
    );
    if (!confirmed) return;

    setDeletingId(category.id);
    setError(null);

    try {
      await financeApi.cashBookCategories.delete(category.id, transactionCount > 0);
      onSaved();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete category.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage cash book categories" size="lg">
      <div className="space-y-6">
        <form onSubmit={handleAddCategory} className="space-y-4 rounded-2xl border-2 border-ui-border bg-ui-softBg/30 p-5">
          <div>
            <h3 className="text-lg font-semibold text-ui-textPrimary">Add category</h3>
            <p className="text-sm text-ui-textMuted">Create custom income or expense categories for the cash book.</p>
          </div>

          {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value as CashBookTransactionType)} required>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </Select>
            <Input
              label="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              required
            />
            <Button type="submit" isLoading={saving}>
              Add category
            </Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          {(['INCOME', 'EXPENSE'] as CashBookTransactionType[]).map((groupType) => (
            <div key={groupType} className="rounded-2xl border-2 border-ui-border bg-white">
              <div className="border-b-2 border-ui-border px-5 py-4">
                <h3 className="text-lg font-semibold text-ui-textPrimary">{groupLabel(groupType)}</h3>
              </div>
              <div className="divide-y divide-ui-border">
                {grouped[groupType].length === 0 ? (
                  <div className="px-5 py-6 text-sm text-ui-textMuted">No categories yet.</div>
                ) : (
                  grouped[groupType].map((category) => (
                    <div key={category.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ui-textPrimary">{category.name}</p>
                          {category.isDefault ? <Badge variant="neutral">Default</Badge> : null}
                        </div>
                        <p className="text-sm text-ui-textMuted">
                          {category._count?.transactions ?? 0} transaction{category._count?.transactions === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteCategory(category)}
                        disabled={deletingId === category.id}
                        leadingIcon={<TrashIcon className="h-4 w-4" />}
                      >
                        {deletingId === category.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
