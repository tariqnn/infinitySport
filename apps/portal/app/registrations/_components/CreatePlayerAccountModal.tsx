'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, Badge, Input } from '../../_components/ui';
import type { PackageRegistrationRow } from '../../../lib/portalApi';

type Props = {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
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
};

export function CreatePlayerAccountModal({ open, onClose, registration }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loginEmail, setLoginEmail] = useState('');

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError('');
      setResult(null);
      setLoginEmail('');
      return;
    }
    setLoginEmail('');
  }, [open]);

  async function handleCreate() {
    if (!registration) return;

    setSubmitting(true);
    setError('');
    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        setError('Enter the player email to use for login.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('Enter a valid player email.');
        return;
      }

      const response = await fetch('/api/tracker-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'player',
          registrationId: registration.id,
          name: registration.customerName,
          email: normalizedEmail,
          autoGenerate: true,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError((data as { error?: string }).error || 'Failed to create player account.');
        return;
      }

      setResult(data as Result);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !registration) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Player Account"
      description="Portal will auto-generate a player login linked to this registered child."
      size="md"
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              {result.created ? 'Player account created successfully' : 'Player account reset successfully'}
            </p>
            <p className="mt-1 text-sm text-green-700">
              Share these credentials with the player.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-ui-textMuted">Player</p>
              <p className="font-medium text-ui-textPrimary">{registration.customerName}</p>
            </div>
            <div>
              <p className="text-ui-textMuted">Login email</p>
              <p className="font-mono font-medium text-ui-textPrimary select-all">{result.user.email}</p>
            </div>
            <div>
              <p className="text-ui-textMuted">Password</p>
              <p className="font-mono font-medium text-ui-textPrimary select-all">{result.password || 'Not returned'}</p>
            </div>
            <div>
              <p className="text-ui-textMuted">Role</p>
              <Badge variant="neutral">{result.user.role}</Badge>
            </div>
            <div>
              <p className="text-ui-textMuted">Linked player ID</p>
              <p className="font-mono text-xs text-ui-textMuted select-all">{result.playerIds[0] || '-'}</p>
            </div>
            {result.membership ? (
              <div className="rounded-lg border border-ui-border px-3 py-2">
                <p className="font-medium text-ui-textPrimary">Membership snapshot</p>
                <p className="mt-1 text-xs text-ui-textMuted">
                  {result.membership.sessionsLeft ?? '—'} sessions left
                  {' · '}
                  {result.membership.pointsBalance} points
                  {' · '}
                  {result.membership.nextPaymentDate || 'No payment date'}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-ui-textMuted">Firebase UID</p>
              <p className="font-mono text-xs text-ui-textMuted select-all">{result.user.uid}</p>
            </div>
          </div>

          <div className="flex justify-end border-t border-ui-border pt-2">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-ui-border bg-ui-softBg/50 p-4 text-sm text-ui-textPrimary">
            <p className="font-medium text-ui-textPrimary">{registration.customerName}</p>
            <p className="mt-1 text-ui-textMuted">
              Package: {registration.packageName}
            </p>
            <p className="mt-1 text-ui-textMuted">
              Enter the player login email. Portal will auto-generate the password and keep the same player profile
              linked. If this player account already exists, Portal will reset the password and keep that same account.
            </p>
          </div>

          <Input
            label="Player login email"
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="player@example.com"
            required
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} isLoading={submitting}>
              Create player account
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
