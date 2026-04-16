'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import {
  financeApi,
  type CashBookCategoryRow,
  type CashBookTransactionRow,
  type CashBookTransactionType,
} from '../../../lib/portalApi';
import { ArrowUpTrayIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

type AttachmentState = {
  url: string | null;
  name: string | null;
  type: string | null;
  size: number | null;
};

const CUSTOM_CATEGORY_VALUE = '__custom__';

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

export function CashBookTransactionModal({
  open,
  onClose,
  onSaved,
  companyId,
  categories,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  categories: CashBookCategoryRow[];
  transaction?: CashBookTransactionRow | null;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [type, setType] = useState<CashBookTransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [attachment, setAttachment] = useState<AttachmentState>({
    url: null,
    name: null,
    type: null,
    size: null,
  });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesForType = useMemo(
    () => categories.filter((row) => row.type === type).sort((left, right) => left.name.localeCompare(right.name)),
    [categories, type],
  );

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      const nextType = transaction.type;
      const matchingCategory =
        transaction.categoryId != null
          ? categories.find((row) => row.id === transaction.categoryId)
          : null;

      setType(nextType);
      setAmount(String(transaction.amount ?? ''));
      setDate(toInputDate(transaction.date) || todayInputValue());
      setNote(transaction.note || '');
      setSelectedCategoryId(matchingCategory ? matchingCategory.id : CUSTOM_CATEGORY_VALUE);
      setCustomCategoryName(matchingCategory ? '' : transaction.categoryName || '');
      setAttachment({
        url: transaction.attachmentUrl || null,
        name: transaction.attachmentName || null,
        type: transaction.attachmentType || null,
        size: transaction.attachmentSize ?? null,
      });
    } else {
      const defaultType: CashBookTransactionType = 'EXPENSE';
      const defaultCategory = categories
        .filter((row) => row.type === defaultType)
        .sort((left, right) => left.name.localeCompare(right.name))[0];

      setType(defaultType);
      setAmount('');
      setDate(todayInputValue());
      setNote('');
      setSelectedCategoryId(defaultCategory?.id || CUSTOM_CATEGORY_VALUE);
      setCustomCategoryName('');
      setAttachment({
        url: null,
        name: null,
        type: null,
        size: null,
      });
    }

    setError(null);
  }, [categories, open, transaction]);

  useEffect(() => {
    if (!open) return;

    const categoryStillValid =
      selectedCategoryId === CUSTOM_CATEGORY_VALUE ||
      categoriesForType.some((row) => row.id === selectedCategoryId);

    if (!categoryStillValid) {
      setSelectedCategoryId(categoriesForType[0]?.id || CUSTOM_CATEGORY_VALUE);
    }
  }, [categoriesForType, open, selectedCategoryId]);

  async function handleAttachmentChange(file: File | null) {
    if (!file) return;

    setUploadingAttachment(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch('/api/portal/cash-book-upload', {
        method: 'POST',
        body,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        url?: string;
        fileName?: string;
        type?: string;
        size?: number;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.message || 'Failed to upload attachment.');
      }

      setAttachment({
        url: payload.url,
        name: payload.fileName || file.name,
        type: payload.type || file.type || null,
        size: payload.size ?? file.size,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload attachment.');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const numericAmount = Math.round(Number(amount));
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Amount must be greater than 0.');
      }

      let categoryId: string | null = selectedCategoryId || null;
      if (categoryId === CUSTOM_CATEGORY_VALUE) categoryId = null;

      let resolvedCategoryName = '';
      if (categoryId) {
        const selected = categories.find((row) => row.id === categoryId);
        if (!selected) throw new Error('Please select a valid category.');
        resolvedCategoryName = selected.name;
      } else {
        const nextCategoryName = customCategoryName.trim();
        if (!nextCategoryName) {
          throw new Error('Please enter a custom category name.');
        }
        const createdCategory = await financeApi.cashBookCategories.create({
          companyId,
          type,
          name: nextCategoryName,
        });
        categoryId = createdCategory.id;
        resolvedCategoryName = createdCategory.name;
      }

      const payload = {
        type,
        amount: numericAmount,
        categoryId,
        categoryName: resolvedCategoryName,
        note: note.trim() || null,
        date,
        attachmentUrl: attachment.url,
        attachmentName: attachment.name,
        attachmentType: attachment.type,
        attachmentSize: attachment.size,
      };

      if (transaction) {
        await financeApi.cashBookTransactions.update(transaction.id, payload);
      } else {
        await financeApi.cashBookTransactions.create({
          companyId,
          ...payload,
        });
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  }

  const isCustomCategory = selectedCategoryId === CUSTOM_CATEGORY_VALUE;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? 'Edit cash book transaction' : 'Add cash book transaction'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as CashBookTransactionType)}
            required
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </Select>
          <Input
            label="Amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categoriesForType.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value={CUSTOM_CATEGORY_VALUE}>+ Add custom category</option>
          </Select>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {isCustomCategory ? (
          <Input
            label="Custom category name"
            value={customCategoryName}
            onChange={(e) => setCustomCategoryName(e.target.value)}
            placeholder="Enter a new category"
            required
          />
        ) : null}

        <Textarea
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Optional details about this transaction"
        />

        <div className="rounded-2xl border-2 border-dashed border-ui-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ui-textPrimary">Attachment</p>
              <p className="text-sm text-ui-textMuted">Optional receipt image or PDF</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment || saving}
                leadingIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
              >
                {uploadingAttachment ? 'Uploading...' : attachment.url ? 'Replace file' : 'Upload file'}
              </Button>
              {attachment.url ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setAttachment({
                      url: null,
                      name: null,
                      type: null,
                      size: null,
                    })
                  }
                  leadingIcon={<XMarkIcon className="h-4 w-4" />}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void handleAttachmentChange(file);
            }}
          />

          {attachment.url ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-ui-border bg-ui-softBg/50 px-4 py-3">
              <PaperClipIcon className="h-5 w-5 text-ui-textMuted" />
              <div className="min-w-0 flex-1">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-semibold text-ui-textPrimary hover:underline"
                >
                  {attachment.name || 'View attachment'}
                </a>
                <p className="text-sm text-ui-textMuted">
                  {attachment.type || 'File'}
                  {attachment.size ? ` - ${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving || uploadingAttachment}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving} disabled={uploadingAttachment}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
