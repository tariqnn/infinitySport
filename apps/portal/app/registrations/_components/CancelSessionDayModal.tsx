'use client';

import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageSessionCanceledApi } from '../../../lib/portalApi';

const DEFAULT_PACKAGES = [
  'Basketball - Little Kobes U10',
  'Basketball - Ballers & Hoopers U12–U14',
  'Basketball - Warriors',
  'Basketball - Private 1v1 Sessions',
  'Basketball - Small Groups',
  'Gymnastics Package A',
  'Gymnastics Package B',
  'Gymnastics Package C',
  'Gymnastics Package D',
  'Volleyball',
];

const REASONS = [
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'BAD_WEATHER', label: 'Bad weather' },
  { value: 'TEACHER_UNAVAILABLE', label: 'Teacher unavailable' },
  { value: 'OTHER', label: 'Other' },
];

export function CancelSessionDayModal({
  open,
  onClose,
  packageOptions,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  packageOptions?: string[];
  onSuccess: () => void;
}) {
  const packageList = packageOptions?.length ? packageOptions : DEFAULT_PACKAGES;
  const [packageName, setPackageName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [reason, setReason] = useState('OTHER');
  const [reasonDetail, setReasonDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!packageName.trim() || !sessionDate) {
      setError('Package and date are required.');
      return;
    }
    setLoading(true);
    try {
      await packageSessionCanceledApi.create({
        packageName: packageName.trim(),
        sessionDate,
        reason,
        reasonDetail: reasonDetail.trim() || undefined,
      });
      onSuccess();
      onClose();
      setPackageName('');
      setSessionDate('');
      setReason('OTHER');
      setReasonDetail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to record canceled session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record canceled session day" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ui-textMuted">
          Sessions on this date will not decrement remaining sessions for registered students.
        </p>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <Select
          label="Package"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          required
        >
          <option value="">Select package</option>
          {packageList.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
        <Input
          label="Session date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          required
        />
        <Select
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </Select>
        <Input
          label="Detail (optional)"
          value={reasonDetail}
          onChange={(e) => setReasonDetail(e.target.value)}
          placeholder="e.g. National holiday"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading} disabled={!packageName.trim() || !sessionDate}>
            Record canceled day
          </Button>
        </div>
      </form>
    </Modal>
  );
}
