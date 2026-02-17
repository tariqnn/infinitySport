'use client';

import { useState, useMemo } from 'react';
import { Modal, Input, Button } from '../../_components/ui';
import type { PackageRegistrationRow } from '../../../lib/portalApi';
import type { InitialPerson } from './AddRegistrationModal';

/** Unique "person" key: phone (or name+phone if we want to allow same phone different names). */
function personKey(r: PackageRegistrationRow): string {
  return `${(r.customerPhone || '').trim().toLowerCase()}`;
}

/** Deduplicate registrations to one row per person (by phone), keep first occurrence for name/email/age. */
function toUniquePersons(rows: PackageRegistrationRow[]): PackageRegistrationRow[] {
  const seen = new Set<string>();
  const out: PackageRegistrationRow[] = [];
  for (const r of rows) {
    const key = personKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function RegisterExistingPersonModal({
  open,
  onClose,
  rows,
  onSelectPerson,
}: {
  open: boolean;
  onClose: () => void;
  rows: PackageRegistrationRow[];
  onSelectPerson: (person: InitialPerson) => void;
}) {
  const [search, setSearch] = useState('');

  const persons = useMemo(() => toUniquePersons(rows), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter(
      (r) =>
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.customerPhone || '').toLowerCase().includes(q) ||
        (r.customerEmail || '').toLowerCase().includes(q)
    );
  }, [persons, search]);

  function handleSelect(r: PackageRegistrationRow) {
    onSelectPerson({
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail ?? undefined,
      customerAge: r.customerAge ?? undefined,
    });
    onClose();
    setSearch('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Register existing person" size="md">
      <p className="mb-4 text-sm text-ui-textMuted">
        Search by name or phone, then select the person to register in a new package.
      </p>
      <Input
        label="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Name or phone..."
        className="mb-4"
      />
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-ui-border">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-ui-textMuted text-sm">
            {persons.length === 0 ? 'No registrations to choose from.' : 'No match for your search.'}
          </div>
        ) : (
          <ul className="divide-y divide-ui-border">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full px-4 py-3 text-left hover:bg-ui-softBg transition"
                >
                  <span className="font-medium text-ui-textPrimary">{r.customerName}</span>
                  <span className="ml-2 text-ui-textMuted">{r.customerPhone}</span>
                  {r.customerEmail && (
                    <span className="block text-xs text-ui-textMuted truncate">{r.customerEmail}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
