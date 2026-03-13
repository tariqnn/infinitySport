'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PageHeader,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Input,
} from '../_components/ui';
import { guestAccountsApi, type GuestAccountRow } from '../../lib/portalApi';
import { AdjustGuestPointsModal } from './_components/AdjustGuestPointsModal';
import {
  ArrowPathIcon,
  GiftTopIcon,
  TrashIcon,
  UserGroupIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function GuestAccountsPage() {
  const [rows, setRows] = useState<GuestAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestAccountRow | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (preserveRows = false) => {
    try {
      if (preserveRows || hasLoadedRef.current) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await guestAccountsApi.list(search || undefined);
      setRows(data);
      hasLoadedRef.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load guest accounts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void load(hasLoadedRef.current);
  }, [load]);

  async function handleDeleteGuest(row: GuestAccountRow) {
    const label = row.name ? `${row.name} (${row.email})` : row.email;
    if (!window.confirm(`Delete guest account ${label}? This removes it from the Portal guest list.`)) {
      return;
    }

    setDeletingEmail(row.email);
    setError(null);
    try {
      await guestAccountsApi.delete(row.email);
      if (selectedGuest?.email === row.email) {
        setSelectedGuest(null);
      }
      await load(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete guest account.');
    } finally {
      setDeletingEmail(null);
    }
  }

  const stats = useMemo(() => {
    const totalGuests = rows.length;
    const totalPoints = rows.reduce((sum, row) => sum + row.totalPoints, 0);
    const rewardPoints = rows.reduce((sum, row) => sum + row.rewardPoints, 0);
    const linkedGuests = rows.filter((row) => row.linkedPlayersCount > 0).length;
    return { totalGuests, totalPoints, rewardPoints, linkedGuests };
  }, [rows]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-ui-textMuted">Loading guest accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Accounts"
        subtitle="Manage booking reward points for guests and linked booking contacts."
        actions={
          <Button
            variant="secondary"
            onClick={() => void load(true)}
            isLoading={refreshing}
            leadingIcon={<ArrowPathIcon className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Guest accounts</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.totalGuests}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <UserGroupIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Total points</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.totalPoints}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <WalletIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Booking rewards</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.rewardPoints}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <GiftTopIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Linked to app</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{stats.linkedGuests}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <UserGroupIcon className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <Input
            label="Search guest accounts"
            placeholder="Search by guest name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </CardBody>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ui-textPrimary">Guest Point Accounts</h2>
            <p className="mt-1 text-sm text-ui-textMuted">
              Booking-derived points plus manual adjustments for guests and booking contacts.
            </p>
          </div>
          <Badge variant="neutral">{rows.length} accounts</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-semibold text-ui-textPrimary">No guest accounts found</p>
              <p className="mt-2 text-sm text-ui-textMuted">
                Guest accounts appear once a guest email exists in Firebase guest access, or when bookings/manual
                guest point adjustments exist for that email.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.14em] text-ui-textMuted">
                  <tr>
                    <th className="px-4 py-3 text-left">Guest</th>
                    <th className="px-4 py-3 text-left">Bookings</th>
                    <th className="px-4 py-3 text-left">Last booking</th>
                    <th className="px-4 py-3 text-left">Linked</th>
                    <th className="px-4 py-3 text-right">Rewards</th>
                    <th className="px-4 py-3 text-right">Manual</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.email}
                      className={`border-t border-ui-border ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-ui-textPrimary">{row.name || 'Guest booking account'}</p>
                        <p className="mt-1 text-xs text-ui-textMuted">{row.email}</p>
                      </td>
                      <td className="px-4 py-4 text-ui-textPrimary">{row.bookingsCount}</td>
                      <td className="px-4 py-4">
                        <p className="text-ui-textPrimary">{formatDateTime(row.lastBookingAt)}</p>
                        <p className="mt-1 text-xs text-ui-textMuted">{row.lastCourt || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={row.linkedPlayersCount > 0 ? 'success' : 'neutral'}>
                          {row.linkedPlayersCount > 0 ? `${row.linkedPlayersCount} player(s)` : 'Guest only'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-ui-textPrimary">{row.rewardPoints}</td>
                      <td className="px-4 py-4 text-right font-semibold text-ui-textPrimary">{row.manualPoints}</td>
                      <td className="px-4 py-4 text-right font-bold text-ui-textPrimary">{row.totalPoints}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedGuest(row)}>
                            Adjust Points
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeleteGuest(row)}
                            isLoading={deletingEmail === row.email}
                            leadingIcon={<TrashIcon className="h-4 w-4" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <AdjustGuestPointsModal
        open={!!selectedGuest}
        guest={selectedGuest}
        onClose={() => setSelectedGuest(null)}
        onSaved={async () => {
          await load(true);
        }}
      />
    </div>
  );
}
