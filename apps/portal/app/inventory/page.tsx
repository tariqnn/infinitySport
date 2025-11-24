'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, DataTable, Badge, Button, Input } from '../_components/ui';
import { inventoryApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CreateInventoryModal } from './_components/CreateInventoryModal';
import { EditInventoryModal } from './_components/EditInventoryModal';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, categoryFilter, statusFilter]);

  async function loadItems() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const data = await inventoryApi.list(company?.id);
      setItems(data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterItems() {
    let filtered = [...items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name?.toLowerCase().includes(term) ||
          i.category?.toLowerCase().includes(term) ||
          i.location?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((i) => i.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    setFilteredItems(filtered);
  }

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const columns = [
    {
      id: 'name',
      header: 'Item Name',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">{row.name}</span>
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
      id: 'location',
      header: 'Location',
      render: (row: any) => (
        <span className="text-textPrimary">{row.location || '—'}</span>
      ),
    },
    {
      id: 'quantity',
      header: 'Quantity',
      render: (row: any) => (
        <span className={row.status === 'OUT_OF_STOCK' ? 'font-semibold text-danger' : row.status === 'LOW' ? 'font-semibold text-warning' : 'text-textPrimary'}>
          {row.quantity}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: any) => {
        const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
          AVAILABLE: 'success',
          LOW: 'warning',
          OUT_OF_STOCK: 'danger',
          RETIRED: 'neutral',
        };
        return <Badge variant={statusMap[row.status] || 'neutral'}>{row.status}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingItem(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Manage facility equipment and supplies"
        actions={
          <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
            Add Item
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-textMuted" />
              <Input
                placeholder="Search by name, category, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-borderColor bg-cardBackground px-4 py-2 text-sm text-textPrimary focus:border-primaryBlue focus:outline-none focus:ring-2 focus:ring-primaryBlue/20"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-borderColor bg-cardBackground px-4 py-2 text-sm text-textPrimary focus:border-primaryBlue focus:outline-none focus:ring-2 focus:ring-primaryBlue/20"
            >
              <option value="all">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="LOW">Low</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredItems} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateInventoryModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadItems();
          }}
        />
      )}

      {editingItem && (
        <EditInventoryModal
          open={!!editingItem}
          item={editingItem}
          onClose={() => {
            setEditingItem(null);
            loadItems();
          }}
        />
      )}
    </div>
  );
}
