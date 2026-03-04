'use client';

import { useState } from 'react';
import { Modal, Button, Badge } from '../../_components/ui';
import type { PackageRegistrationRow } from '../../../lib/portalApi';

type Props = {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
};

type Result = {
  uid: string;
  email: string;
  password: string;
  role: string;
  playerId: string | null;
};

export function CreateTrackerAccountModal({ open, onClose, registration }: Props) {
  const [role, setRole] = useState<'parent' | 'coach'>('parent');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const resetState = () => {
    setRole('parent');
    setPosition('');
    setEmail('');
    setSubmitting(false);
    setError('');
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!registration) return;
    setError('');
    setSubmitting(true);

    const emailToUse = email.trim() || registration.customerEmail;
    if (!emailToUse) {
      setError('Email is required. This person has no email on file — enter one above.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/tracker-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registration.customerName,
          email: emailToUse,
          phone: registration.customerPhone,
          age: registration.customerAge,
          role,
          position: position.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
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

  if (!registration) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Create Account for Infinity Tracker" size="sm">
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">Account created successfully</p>
            <p className="mt-1 text-sm text-green-700">Share these credentials with {registration.customerName}:</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-ui-textMuted">Email</p>
              <p className="font-mono font-medium text-ui-textPrimary select-all">{result.email}</p>
            </div>
            <div>
              <p className="text-ui-textMuted">Temporary Password</p>
              <p className="font-mono font-medium text-ui-textPrimary select-all">{result.password}</p>
            </div>
            <div>
              <p className="text-ui-textMuted">Role</p>
              <Badge variant="neutral">{result.role}</Badge>
            </div>
            {result.playerId && (
              <div>
                <p className="text-ui-textMuted">Player ID</p>
                <p className="font-mono text-xs text-ui-textMuted select-all">{result.playerId}</p>
              </div>
            )}
            <div>
              <p className="text-ui-textMuted">Firebase UID</p>
              <p className="font-mono text-xs text-ui-textMuted select-all">{result.uid}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-ui-border">
            <Button variant="primary" onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <div>
              <p className="text-ui-textMuted">Name</p>
              <p className="font-medium text-ui-textPrimary">{registration.customerName}</p>
            </div>
            <div>
              <p className="text-ui-textMuted">Package</p>
              <p className="text-ui-textPrimary">{registration.packageName}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-textPrimary mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email || registration.customerEmail || ''}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary outline-none"
            />
            {!registration.customerEmail && !email && (
              <p className="mt-1 text-xs text-amber-600">No email on file. Please enter one.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-textPrimary mb-1">Role</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="parent"
                  checked={role === 'parent'}
                  onChange={() => setRole('parent')}
                  className="text-brand-blue-primary focus:ring-brand-blue-primary"
                />
                <span className="text-sm">Parent (with player)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
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
            {role === 'parent' && (
              <p className="mt-1 text-xs text-ui-textMuted">A player profile will be auto-created and linked to this parent.</p>
            )}
          </div>

          {role === 'parent' && (
            <div>
              <label className="block text-sm font-medium text-ui-textPrimary mb-1">Player Position (optional)</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Point Guard, Forward"
                className="w-full rounded-lg border border-ui-border px-3 py-2 text-sm focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary outline-none"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-ui-border">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={submitting} disabled={submitting}>
              Create Account
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
