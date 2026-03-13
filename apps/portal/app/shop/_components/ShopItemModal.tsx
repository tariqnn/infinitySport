'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { Modal, Input, Textarea, Select, Button } from '../../_components/ui';
import type { ShopItemRow, ShopItemStatus } from '../../../lib/portalApi';
import { ArrowUpTrayIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

type ShopItemForm = {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  pointsCost: string;
  quantityAvailable: string;
  status: ShopItemStatus;
  isFeatured: boolean;
  redemptionNote: string;
  sortOrder: string;
};

const EMPTY_FORM: ShopItemForm = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  pointsCost: '',
  quantityAvailable: '',
  status: 'ACTIVE',
  isFeatured: false,
  redemptionNote: '',
  sortOrder: '0',
};

function mapItemToForm(item?: ShopItemRow | null): ShopItemForm {
  if (!item) return EMPTY_FORM;
  return {
    name: item.name || '',
    category: item.category || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    pointsCost: String(item.pointsCost || ''),
    quantityAvailable:
      item.quantityAvailable == null ? '' : String(item.quantityAvailable),
    status: item.status,
    isFeatured: Boolean(item.isFeatured),
    redemptionNote: item.redemptionNote || '',
    sortOrder: String(item.sortOrder ?? 0),
  };
}

export function ShopItemModal({
  open,
  item,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item?: ShopItemRow | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    category?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    pointsCost: number;
    quantityAvailable?: number | null;
    status: ShopItemStatus;
    isFeatured: boolean;
    redemptionNote?: string | null;
    sortOrder?: number;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<ShopItemForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(mapItemToForm(item));
    setError(null);
    setUploadingImage(false);
  }, [item, open]);

  function update<K extends keyof ShopItemForm>(key: K, value: ShopItemForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch('/api/portal/shop-upload', {
        method: 'POST',
        body,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to upload image.');
      }

      update('imageUrl', String(payload.url || ''));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submit() {
    setError(null);

    const pointsCost = Number(form.pointsCost);
    const quantityAvailable =
      form.quantityAvailable.trim() === '' ? null : Number(form.quantityAvailable);
    const sortOrder = Number(form.sortOrder || 0);

    if (!form.name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      setError('Points required must be greater than 0.');
      return;
    }
    if (quantityAvailable != null && (!Number.isFinite(quantityAvailable) || quantityAvailable < 0)) {
      setError('Quantity available must be 0 or greater.');
      return;
    }
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      setError('Sort order must be 0 or greater.');
      return;
    }

    try {
      await onSubmit({
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        pointsCost: Math.round(pointsCost),
        quantityAvailable: quantityAvailable == null ? null : Math.round(quantityAvailable),
        status: form.status,
        isFeatured: form.isFeatured,
        redemptionNote: form.redemptionNote.trim() || null,
        sortOrder: Math.round(sortOrder),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save shop item.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit shop item' : 'Add shop item'}
      description="Manage what players can redeem in the mobile app."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving || uploadingImage}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={saving}>
            {item ? 'Save changes' : 'Create item'}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Item name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Basketball jersey"
              required
            />
            <Input
              label="Category"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="Apparel, accessories, gear"
            />
          </div>

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Short description of the reward item."
            className="min-h-[110px]"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Points required"
              type="number"
              min={1}
              value={form.pointsCost}
              onChange={(e) => update('pointsCost', e.target.value)}
              required
            />
            <Input
              label="Quantity available"
              type="number"
              min={0}
              value={form.quantityAvailable}
              onChange={(e) => update('quantityAvailable', e.target.value)}
              hint="Leave empty for unlimited stock."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Visibility"
              value={form.status}
              onChange={(e) => update('status', e.target.value as ShopItemStatus)}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SOLD_OUT', label: 'Sold out' },
                { value: 'HIDDEN', label: 'Hidden from app' },
              ]}
            />
            <Input
              label="Sort order"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => update('sortOrder', e.target.value)}
              hint="Lower numbers appear first."
            />
          </div>

          <Textarea
            label="Redemption notes"
            value={form.redemptionNote}
            onChange={(e) => update('redemptionNote', e.target.value)}
            placeholder="Pickup rules, size notes, or instructions for staff."
          />

          <label className="flex items-center gap-3 rounded-xl border border-ui-border bg-[#f8fafc] px-4 py-3 text-sm text-ui-textPrimary">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => update('isFeatured', e.target.checked)}
              className="h-4 w-4 rounded border-ui-border text-[#0b1f4f] focus:ring-[#0b1f4f]"
            />
            <span>
              Feature this item in the app
            </span>
          </label>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-ui-border bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ui-textPrimary">Item photo</p>
                <p className="text-xs text-ui-textMuted">Upload a product photo or paste an existing image URL.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                leadingIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
              >
                {uploadingImage ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
            />

            <Input
              label="Image URL"
              value={form.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="/uploads/shop/..."
            />

            <div className="mt-4 overflow-hidden rounded-2xl border border-ui-border bg-white">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt={form.name || 'Shop item preview'}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] text-ui-textMuted">
                  <PhotoIcon className="h-10 w-10 text-[#94a3b8]" />
                  <p className="text-sm">No photo yet</p>
                </div>
              )}
            </div>

            {form.imageUrl ? (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update('imageUrl', '')}
                  leadingIcon={<TrashIcon className="h-4 w-4" />}
                >
                  Remove photo
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-ui-border bg-white p-4">
            <p className="text-sm font-semibold text-ui-textPrimary">Mobile app preview</p>
            <div className="mt-4 rounded-2xl border border-ui-border bg-[#071427] p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{form.name || 'Shop item title'}</p>
                  <p className="mt-1 truncate text-sm text-slate-300">{form.category || 'Category'}</p>
                </div>
                <span className="rounded-full bg-[#0ea5e9]/20 px-3 py-1 text-xs font-semibold text-[#bae6fd]">
                  {form.pointsCost || '0'} pts
                </span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm text-slate-200">
                {form.description || 'Description will appear here in the app.'}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                <span>{form.status.replace('_', ' ')}</span>
                <span>
                  {form.quantityAvailable.trim() ? `${form.quantityAvailable} left` : 'Unlimited'}
                </span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
