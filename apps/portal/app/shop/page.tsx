'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PageHeader,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Input,
  Select,
} from '../_components/ui';
import { getFirstCompany, shopApi, type ShopItemRow, type ShopItemStatus } from '../../lib/portalApi';
import { ShopItemModal } from './_components/ShopItemModal';
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  GiftTopIcon,
  PhotoIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function ShopPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ShopItemStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItemRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const company = await getFirstCompany();
      if (!company?.id) {
        throw new Error('No company found for Portal shop.');
      }
      setCompanyId(company.id);
      const rows = await shopApi.list(company.id);
      setItems(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load shop items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!term) return true;
      return [
        item.name,
        item.category,
        item.description,
        item.redemptionNote,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [categoryFilter, items, search, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.status === 'ACTIVE').length;
    const featured = items.filter((item) => item.isFeatured).length;
    const averageCost =
      items.length > 0
        ? Math.round(items.reduce((sum, item) => sum + item.pointsCost, 0) / items.length)
        : 0;
    const stock = items.reduce((sum, item) => sum + (item.quantityAvailable ?? 0), 0);
    return { active, featured, averageCost, stock };
  }, [items]);

  async function handleSave(payload: {
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
  }) {
    if (!companyId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingItem) {
        await shopApi.update(editingItem.id, payload);
        setMessage('Shop item updated. App catalog sync was triggered.');
      } else {
        await shopApi.create({ companyId, ...payload });
        setMessage('Shop item created. App catalog sync was triggered.');
      }
      setShowModal(false);
      setEditingItem(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save shop item.');
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ShopItemRow) {
    const confirmed = window.confirm(`Delete "${item.name}" from the shop?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setError(null);
    setMessage(null);
    try {
      await shopApi.delete(item.id);
      setMessage('Shop item deleted. App catalog sync was triggered.');
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete shop item.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePublishToApp() {
    if (!companyId) return;
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await shopApi.publish(companyId);
      setMessage(`Published ${result.synced} shop item(s) to Firebase for the mobile app.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish shop catalog.');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-ui-textMuted">Loading shop catalog...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop"
        subtitle="Manage the reward catalog that appears in the mobile app."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void load()}
              leadingIcon={<ArrowPathIcon className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={handlePublishToApp}
              isLoading={syncing}
              leadingIcon={<CloudArrowUpIcon className="h-4 w-4" />}
            >
              Publish to App
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setShowModal(true);
              }}
              leadingIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Shop Item
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Active items</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.active}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <GiftTopIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Featured</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.featured}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-500">
              <StarIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Avg points cost</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.averageCost}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <PhotoIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Tracked stock</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.stock}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <CloudArrowUpIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 xl:flex-row">
            <div className="flex-1">
              <Input
                label="Search catalog"
                placeholder="Search by item, category, description, or notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full xl:w-56">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | ShopItemStatus)}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'SOLD_OUT', label: 'Sold out' },
                  { value: 'HIDDEN', label: 'Hidden' },
                ]}
              />
            </div>
            <div className="w-full xl:w-56">
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ui-textPrimary">Catalog Items</h2>
            <p className="mt-1 text-sm text-ui-textMuted">
              Photo-first cards for staff to manage what players can retrieve in the app.
            </p>
          </div>
          <Badge variant="neutral">{filteredItems.length} items</Badge>
        </CardHeader>
        <CardBody>
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ui-border bg-[#f8fafc] px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <GiftTopIcon className="h-7 w-7 text-ui-textMuted" />
              </div>
              <p className="mt-4 text-base font-semibold text-ui-textPrimary">No shop items found</p>
              <p className="mt-2 text-sm text-ui-textMuted">
                Add rewards with photos and points cost so the mobile app can show the catalog clearly.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[24px] border border-ui-border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                >
                  <div className="relative h-48 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ui-textMuted">
                        <PhotoIcon className="h-12 w-12 text-[#94a3b8]" />
                      </div>
                    )}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <Badge variant={item.status === 'ACTIVE' ? 'success' : item.status === 'SOLD_OUT' ? 'warning' : 'neutral'}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                      {item.isFeatured ? <Badge variant="info">Featured</Badge> : null}
                    </div>
                    <div className="absolute bottom-4 right-4 rounded-full bg-[#071427]/88 px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
                      {item.pointsCost} pts
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-ui-textPrimary">{item.name}</h3>
                          <p className="mt-1 truncate text-sm text-ui-textMuted">{item.category || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <p className="mt-3 min-h-[44px] text-sm leading-6 text-ui-textMuted">
                        {item.description || 'No description added yet.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f8fafc] p-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-ui-textMuted">Stock</p>
                        <p className="mt-1 font-semibold text-ui-textPrimary">
                          {item.quantityAvailable == null ? 'Unlimited' : item.quantityAvailable}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-ui-textMuted">Sort order</p>
                        <p className="mt-1 font-semibold text-ui-textPrimary">{item.sortOrder}</p>
                      </div>
                    </div>

                    <div className="min-h-[40px] rounded-xl border border-ui-border bg-white px-3 py-2 text-sm text-ui-textMuted">
                      {item.redemptionNote || 'No redemption notes.'}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId === item.id}
                        leadingIcon={<TrashIcon className="h-4 w-4" />}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ShopItemModal
        open={showModal}
        item={editingItem}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setShowModal(false);
          setEditingItem(null);
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
