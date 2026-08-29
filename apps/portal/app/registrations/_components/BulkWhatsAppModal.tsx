'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Button, Modal, Select, Textarea } from '../../_components/ui';
import {
  packageRegistrationsApi,
  type PackageRegistrationRow,
  type RegistrationWhatsAppBroadcastResult,
} from '../../../lib/portalApi';

type AudienceType = 'selected' | 'package';

type BulkWhatsAppModalProps = {
  open: boolean;
  onClose: () => void;
  rows: PackageRegistrationRow[];
  selectedRegistrationIds: Set<string>;
  packageOptions: string[];
  defaultPackageName?: string;
};

function phoneKey(value: string | null | undefined) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (!raw.startsWith('+') && !digits.startsWith('962')) {
    digits = digits.startsWith('0') ? `962${digits.slice(1)}` : `962${digits}`;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

function uniquePhoneCount(rows: PackageRegistrationRow[]) {
  return new Set(rows.map((row) => phoneKey(row.customerPhone)).filter(Boolean)).size;
}

export function BulkWhatsAppModal({
  open,
  onClose,
  rows,
  selectedRegistrationIds,
  packageOptions,
  defaultPackageName,
}: BulkWhatsAppModalProps) {
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRegistrationIds.has(row.id)),
    [rows, selectedRegistrationIds],
  );
  const [audience, setAudience] = useState<AudienceType>('selected');
  const [packageName, setPackageName] = useState('');
  const [packageRows, setPackageRows] = useState<PackageRegistrationRow[]>([]);
  const [loadingPackageCount, setLoadingPackageCount] = useState(false);
  const [packageCountError, setPackageCountError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationWhatsAppBroadcastResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setAudience(selectedRegistrationIds.size > 0 ? 'selected' : 'package');
    setPackageName(defaultPackageName || packageOptions[0] || '');
    setPackageRows([]);
    setMessage('');
    setError(null);
    setResult(null);
  }, [
    defaultPackageName,
    open,
    packageOptions,
    selectedRegistrationIds.size,
  ]);

  useEffect(() => {
    if (!open || audience !== 'package' || !packageName) {
      setLoadingPackageCount(false);
      setPackageCountError(null);
      setPackageRows([]);
      return;
    }

    let active = true;
    setLoadingPackageCount(true);
    setPackageCountError(null);
    packageRegistrationsApi
      .list(packageName)
      .then((data) => {
        if (!active) return;
        setPackageRows(
          data.filter((row) => String(row.status || 'ACTIVE').toUpperCase() === 'ACTIVE'),
        );
      })
      .catch((loadError) => {
        if (!active) return;
        setPackageRows([]);
        setPackageCountError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load the package recipients.',
        );
      })
      .finally(() => {
        if (active) setLoadingPackageCount(false);
      });

    return () => {
      active = false;
    };
  }, [audience, open, packageName]);

  const selectedRecipientCount = uniquePhoneCount(selectedRows);
  const packageRecipientCount = uniquePhoneCount(packageRows);
  const recipientCount =
    audience === 'selected' ? selectedRecipientCount : packageRecipientCount;
  const audienceReady =
    audience === 'selected'
      ? selectedRecipientCount > 0
      : Boolean(packageName) &&
        packageRecipientCount > 0 &&
        !loadingPackageCount &&
        !packageCountError;
  const canSend =
    audienceReady && message.trim().length > 0 && !sending && !result;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const response = await packageRegistrationsApi.sendWhatsAppBroadcast(
        audience === 'selected'
          ? {
              audienceType: 'selected',
              registrationIds: selectedRows.map((row) => row.id),
              message: message.trim(),
            }
          : {
              audienceType: 'package',
              packageName,
              message: message.trim(),
            },
      );
      setResult(response);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'The WhatsApp broadcast could not be sent.',
      );
    } finally {
      setSending(false);
    }
  }

  const handleClose = () => {
    if (!sending) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Message players on WhatsApp"
      description="Send one message to selected players or everyone in a package."
      size="lg"
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-ui-textPrimary">Choose recipients</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                audience === 'selected'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-ui-border bg-white hover:bg-ui-softBg'
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="whatsapp-audience"
                  value="selected"
                  checked={audience === 'selected'}
                  onChange={() => {
                    setAudience('selected');
                    setError(null);
                    setResult(null);
                  }}
                  className="mt-1 h-4 w-4 border-ui-border text-emerald-600 focus:ring-emerald-600"
                />
                <span>
                  <span className="flex items-center gap-2 font-bold text-ui-textPrimary">
                    <UserGroupIcon className="h-5 w-5" />
                    Selected players
                  </span>
                  <span className="mt-1 block text-sm text-ui-textMuted">
                    {selectedRecipientCount
                      ? `${selectedRecipientCount} unique WhatsApp recipient${selectedRecipientCount === 1 ? '' : 's'} selected`
                      : 'Select players using the table checkboxes first'}
                  </span>
                </span>
              </span>
            </label>

            <label
              className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                audience === 'package'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-ui-border bg-white hover:bg-ui-softBg'
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="whatsapp-audience"
                  value="package"
                  checked={audience === 'package'}
                  onChange={() => {
                    setAudience('package');
                    setError(null);
                    setResult(null);
                  }}
                  className="mt-1 h-4 w-4 border-ui-border text-emerald-600 focus:ring-emerald-600"
                />
                <span>
                  <span className="flex items-center gap-2 font-bold text-ui-textPrimary">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    Entire package
                  </span>
                  <span className="mt-1 block text-sm text-ui-textMuted">
                    Message every active player in one package
                  </span>
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {audience === 'package' ? (
          <div>
            <Select
              label="Package"
              value={packageName}
              onChange={(event) => {
                setPackageName(event.target.value);
                setError(null);
                setResult(null);
              }}
              disabled={sending}
            >
              <option value="">Choose a package</option>
              {packageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <div className="mt-2 min-h-6 text-sm" aria-live="polite">
              {loadingPackageCount ? (
                <span className="text-ui-textMuted">Counting package recipients...</span>
              ) : packageCountError ? (
                <span className="font-medium text-red-700">{packageCountError}</span>
              ) : packageName ? (
                <span className="font-medium text-emerald-700">
                  {packageRecipientCount} unique WhatsApp recipient
                  {packageRecipientCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <Textarea
          label="Message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setError(null);
            setResult(null);
          }}
          placeholder="Type the message that every player will receive..."
          maxLength={1600}
          rows={7}
          disabled={sending}
          hint={`${message.length}/1600 characters. The same message is sent separately to each WhatsApp number.`}
          className="resize-y"
        />

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Review the audience and message before sending. WhatsApp may require an approved
              business message template when a player has not contacted the academy recently.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        {result ? (
          <div
            className={`rounded-xl border px-4 py-4 ${
              result.failed || result.sent === 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <CheckCircleIcon
                className={`h-6 w-6 shrink-0 ${
                  result.failed || result.sent === 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              />
              <div>
                <p className="font-bold text-ui-textPrimary">
                  Sent to {result.sent} of {result.uniqueRecipients} recipients
                </p>
                <p className="mt-1 text-sm text-ui-textMuted">
                  {result.failed ? `${result.failed} failed. ` : ''}
                  {result.invalidPhoneCount
                    ? `${result.invalidPhoneCount} invalid phone number${result.invalidPhoneCount === 1 ? '' : 's'} skipped. `
                    : ''}
                  {result.duplicatePhoneCount
                    ? `${result.duplicatePhoneCount} duplicate registration${result.duplicatePhoneCount === 1 ? '' : 's'} skipped.`
                    : ''}
                </p>
                {result.failures.length ? (
                  <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-sm text-red-700">
                    {result.failures.map((failure) => (
                      <li key={`${failure.registrationId}-${failure.customerPhone}`}>
                        <strong>{failure.customerName}:</strong> {failure.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-ui-border pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={sending}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            isLoading={sending}
            loadingLabel="Sending messages..."
            leadingIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
            className="border-emerald-700 bg-emerald-700 hover:bg-emerald-800"
          >
            Send to {recipientCount} player{recipientCount === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
