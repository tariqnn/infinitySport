'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Badge } from '../../_components/ui';
import type { PackageRegistrationRow } from '../../../lib/portalApi';

type Props = {
  open: boolean;
  onClose: () => void;
  registrations: PackageRegistrationRow[];
  initialRole?: 'parent' | 'coach';
};

type LinkedPlayerForm = {
  childKey: string;
  registrationId: string;
  name: string;
  age: number | null;
  primaryPosition: string;
  sessionsLeft: string;
  nextPaymentDate: string;
  planLabel: string;
  sourcePackageName: string;
};

type Result = {
  ok: boolean;
  created: boolean;
  updatedExisting: boolean;
  user: {
    uid: string;
    email: string;
    role: string;
  };
  password?: string;
  playerIds: string[];
  membership: {
    sessionsLeft: number | null;
    pointsBalance: number;
    nextPaymentDate: string | null;
    planLabel: string | null;
  } | null;
  players?: Array<{
    id: string;
    name: string;
    membership: {
      sessionsLeft: number | null;
      pointsBalance: number;
      nextPaymentDate: string | null;
      planLabel: string | null;
    };
  }>;
};

function normalizePlayerKey(registration: PackageRegistrationRow): string {
  return `${(registration.customerName || '').trim().toLowerCase()}|${registration.customerAge ?? ''}`;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function dedupeLinkedPlayers(registrations: PackageRegistrationRow[]): LinkedPlayerForm[] {
  const latestByChild = new Map<string, PackageRegistrationRow>();

  const sorted = [...registrations].sort((left, right) => {
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    return rightTime - leftTime;
  });

  for (const registration of sorted) {
    const childKey = normalizePlayerKey(registration);
    if (!latestByChild.has(childKey)) {
      latestByChild.set(childKey, registration);
    }
  }

  return Array.from(latestByChild.entries()).map(([childKey, registration]) => ({
    childKey,
    registrationId: registration.id,
    name: registration.customerName,
    age: registration.customerAge ?? null,
    primaryPosition: 'Not set',
    sessionsLeft: registration.sessionsLeft != null ? String(registration.sessionsLeft) : '',
    nextPaymentDate: toDateInputValue(registration.nextPaymentDate),
    planLabel: registration.planLabel || registration.packageName || '',
    sourcePackageName: registration.packageName,
  }));
}

export function CreateTrackerAccountModal({ open, onClose, registrations, initialRole = 'parent' }: Props) {
  const [role, setRole] = useState<'parent' | 'coach'>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [linkedPlayers, setLinkedPlayers] = useState<LinkedPlayerForm[]>([]);

  const mainRegistration = registrations[0] ?? null;
  const isCoachOnly = registrations.length === 0 && initialRole === 'coach';

  const linkedPlayerCount = useMemo(() => linkedPlayers.length, [linkedPlayers.length]);

  const resetState = () => {
    setRole(initialRole);
    setName('');
    setEmail('');
    setSubmitting(false);
    setError('');
    setResult(null);
    setLinkedPlayers([]);
  };

  useEffect(() => {
    if (!open) return;

    setRole(initialRole);
    setError('');
    setResult(null);
    setSubmitting(false);

    if (registrations.length > 0) {
      setName(registrations[0]?.customerName ?? '');
      setEmail(registrations[0]?.customerEmail ?? '');
      setLinkedPlayers(dedupeLinkedPlayers(registrations));
    } else {
      setName('');
      setEmail('');
      setLinkedPlayers([]);
    }
  }, [initialRole, open, registrations]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const updateLinkedPlayer = (childKey: string, patch: Partial<LinkedPlayerForm>) => {
    setLinkedPlayers((current) =>
      current.map((player) => (player.childKey === childKey ? { ...player, ...patch } : player)),
    );
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    const emailToUse = email.trim();
    const nameToUse = name.trim();

    if (!emailToUse) {
      setError('Please enter the email for the account.');
      setSubmitting(false);
      return;
    }

    if (!nameToUse) {
      setError('Please enter the account holder name.');
      setSubmitting(false);
      return;
    }

    if (!isCoachOnly && role === 'parent') {
      if (linkedPlayers.length === 0) {
        setError('At least one linked player is required.');
        setSubmitting(false);
        return;
      }

      for (const player of linkedPlayers) {
        if (!player.sessionsLeft.trim()) {
          setError(`Sessions left is required for ${player.name}.`);
          setSubmitting(false);
          return;
        }
        if (!player.nextPaymentDate.trim()) {
          setError(`Next payment date is required for ${player.name}.`);
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      const response = await fetch('/api/tracker-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameToUse,
          email: emailToUse,
          phone: mainRegistration?.customerPhone,
          role: isCoachOnly ? 'coach' : role,
          players: !isCoachOnly && role === 'parent'
            ? linkedPlayers.map((player) => ({
                childKey: player.childKey,
                registrationId: player.registrationId,
                name: player.name,
                age: player.age,
                primaryPosition: player.primaryPosition || 'Not set',
                sessionsLeft: Math.max(0, parseInt(player.sessionsLeft, 10) || 0),
                nextPaymentDate: player.nextPaymentDate,
                planLabel: player.planLabel.trim() || player.sourcePackageName,
              }))
            : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create account.');
        setSubmitting(false);
        return;
      }

      setResult(data as Result);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isCoachOnly ? 'Create Coach Account for Infinity Tracker' : 'Create Account for Infinity Tracker'}
      size="md"
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              {result.updatedExisting ? 'Account updated successfully' : 'Account created successfully'}
            </p>
            <p className="mt-1 text-sm text-green-700">
              {result.password
                ? `Share these credentials with ${result.user.email}.`
                : `Membership fields were synced for ${result.user.email}.`}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-ui-textMuted">Email</p>
              <p className="font-mono font-medium text-ui-textPrimary select-all">{result.user.email}</p>
            </div>
            {result.password ? (
              <div>
                <p className="text-ui-textMuted">Temporary Password</p>
                <p className="font-mono font-medium text-ui-textPrimary select-all">{result.password}</p>
              </div>
            ) : (
              <div>
                <p className="text-ui-textMuted">Password</p>
                <p className="text-ui-textPrimary">No new password generated</p>
              </div>
            )}
            <div>
              <p className="text-ui-textMuted">Role</p>
              <Badge variant="neutral">{result.user.role}</Badge>
            </div>
            {result.playerIds.length > 0 && (
              <div>
                <p className="text-ui-textMuted">Player IDs</p>
                <div className="space-y-1">
                  {result.playerIds.map((playerId) => (
                    <p key={playerId} className="font-mono text-xs text-ui-textMuted select-all">{playerId}</p>
                  ))}
                </div>
              </div>
            )}
            {result.players && result.players.length > 0 && (
              <div>
                <p className="text-ui-textMuted">Membership verification</p>
                <div className="mt-2 space-y-2">
                  {result.players.map((player) => (
                    <div key={player.id} className="rounded-lg border border-ui-border px-3 py-2">
                      <p className="font-medium text-ui-textPrimary">{player.name}</p>
                      <p className="text-xs text-ui-textMuted">
                        {player.membership.sessionsLeft ?? '—'} sessions left
                        {' · '}
                        {player.membership.pointsBalance} points
                        {' · '}
                        {player.membership.nextPaymentDate || 'No payment date'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-ui-textMuted">Firebase UID</p>
              <p className="font-mono text-xs text-ui-textMuted select-all">{result.user.uid}</p>
            </div>
          </div>

          <div className="flex justify-end border-t border-ui-border pt-2">
            <Button variant="primary" onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-ui-textPrimary">
                Account holder name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={isCoachOnly ? 'Coach name' : 'Parent name'}
                className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-ui-textPrimary">
                Email for the account <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={mainRegistration?.customerEmail || 'e.g. parent@example.com'}
                className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary"
              />
              <p className="mt-1 text-xs text-ui-textMuted">Firebase Auth and Firestore will be updated server-side.</p>
            </div>
          </div>

          {!isCoachOnly && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ui-textPrimary">Role</label>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="parent"
                    checked={role === 'parent'}
                    onChange={() => setRole('parent')}
                    className="text-brand-blue-primary focus:ring-brand-blue-primary"
                  />
                  <span className="text-sm">Parent</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="coach"
                    checked={role === 'coach'}
                    onChange={() => setRole('coach')}
                    className="text-brand-blue-primary focus:ring-brand-blue-primary"
                  />
                  <span className="text-sm">Coach</span>
                </label>
              </div>
            </div>
          )}

          {!isCoachOnly && role === 'parent' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-ui-border bg-ui-softBg/40 px-3 py-2 text-sm text-ui-textMuted">
                {linkedPlayerCount} linked player{linkedPlayerCount !== 1 ? 's' : ''} will be synced to Firebase for this parent account.
              </div>

              {linkedPlayers.map((player) => (
                <div key={player.childKey} className="space-y-3 rounded-lg border border-ui-border p-4">
                  <div>
                    <p className="font-medium text-ui-textPrimary">{player.name}</p>
                    <p className="text-xs text-ui-textMuted">
                      Source package: {player.sourcePackageName}
                      {player.age != null ? ` · Age ${player.age}` : ''}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ui-textPrimary">
                        Sessions left <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={player.sessionsLeft}
                        onChange={(event) => updateLinkedPlayer(player.childKey, { sessionsLeft: event.target.value })}
                        className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-ui-textPrimary">
                        Next payment date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={player.nextPaymentDate}
                        onChange={(event) => updateLinkedPlayer(player.childKey, { nextPaymentDate: event.target.value })}
                        className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-ui-textPrimary">Plan label</label>
                      <input
                        type="text"
                        value={player.planLabel}
                        onChange={(event) => updateLinkedPlayer(player.childKey, { planLabel: event.target.value })}
                        placeholder="Optional; defaults to package name"
                        className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-ui-textPrimary">Primary position</label>
                      <input
                        type="text"
                        value={player.primaryPosition}
                        onChange={(event) => updateLinkedPlayer(player.childKey, { primaryPosition: event.target.value })}
                        placeholder="Optional; defaults to Not set"
                        className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-ui-border pt-2">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={submitting} disabled={submitting}>
              Save Account
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
