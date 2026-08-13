'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Button, Modal, Select } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';
import {
  contactExportFilename,
  createRegistrationVCard,
  prepareRegistrationContacts,
} from '../../../lib/registrationContactExport';

type AudienceType = 'selected' | 'package';

type ExportPlayerContactsModalProps = {
  open: boolean;
  onClose: () => void;
  rows: PackageRegistrationRow[];
  selectedRegistrationIds: Set<string>;
  packageOptions: string[];
  defaultPackageName?: string;
};

export function ExportPlayerContactsModal({
  open,
  onClose,
  rows,
  selectedRegistrationIds,
  packageOptions,
  defaultPackageName,
}: ExportPlayerContactsModalProps) {
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRegistrationIds.has(row.id)),
    [rows, selectedRegistrationIds],
  );
  const [audience, setAudience] = useState<AudienceType>('selected');
  const [packageName, setPackageName] = useState('');
  const [packageRows, setPackageRows] = useState<PackageRegistrationRow[]>([]);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [downloadedCount, setDownloadedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setAudience(selectedRegistrationIds.size > 0 ? 'selected' : 'package');
    setPackageName(defaultPackageName || packageOptions[0] || '');
    setPackageRows([]);
    setPackageError(null);
    setDownloadedCount(null);
  }, [defaultPackageName, open, packageOptions, selectedRegistrationIds.size]);

  useEffect(() => {
    if (!open || audience !== 'package' || !packageName) {
      setPackageRows([]);
      setLoadingPackage(false);
      setPackageError(null);
      return;
    }

    let active = true;
    setLoadingPackage(true);
    setPackageError(null);
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
        setPackageError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load players from this package.',
        );
      })
      .finally(() => {
        if (active) setLoadingPackage(false);
      });

    return () => {
      active = false;
    };
  }, [audience, open, packageName]);

  const audienceRows = audience === 'selected' ? selectedRows : packageRows;
  const exportData = useMemo(
    () => prepareRegistrationContacts(audienceRows),
    [audienceRows],
  );
  const canDownload =
    exportData.contacts.length > 0 &&
    !loadingPackage &&
    !packageError;

  function selectAudience(nextAudience: AudienceType) {
    setAudience(nextAudience);
    setDownloadedCount(null);
  }

  function handleDownload() {
    if (!canDownload) return;

    const vCard = createRegistrationVCard(exportData.contacts);
    const blob = new Blob([vCard], { type: 'text/vcard;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = contactExportFilename(
      audience === 'package' ? packageName : 'selected-players',
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
    setDownloadedCount(exportData.contacts.length);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export player contacts"
      description="Download a phone contact file so the players are easy to find in WhatsApp."
      size="lg"
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-ui-textPrimary">Choose players</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                audience === 'selected'
                  ? 'border-brand-blue-primary bg-blue-50'
                  : 'border-ui-border bg-white hover:bg-ui-softBg'
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="contact-export-audience"
                  checked={audience === 'selected'}
                  onChange={() => selectAudience('selected')}
                  className="mt-1 h-4 w-4 border-ui-border text-brand-blue-primary focus:ring-brand-blue-primary"
                />
                <span>
                  <span className="flex items-center gap-2 font-bold text-ui-textPrimary">
                    <UserGroupIcon className="h-5 w-5" />
                    Selected players
                  </span>
                  <span className="mt-1 block text-sm text-ui-textMuted">
                    {selectedRows.length
                      ? `${selectedRows.length} table selection${selectedRows.length === 1 ? '' : 's'}`
                      : 'Select players using the table checkboxes first'}
                  </span>
                </span>
              </span>
            </label>

            <label
              className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                audience === 'package'
                  ? 'border-brand-blue-primary bg-blue-50'
                  : 'border-ui-border bg-white hover:bg-ui-softBg'
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="contact-export-audience"
                  checked={audience === 'package'}
                  onChange={() => selectAudience('package')}
                  className="mt-1 h-4 w-4 border-ui-border text-brand-blue-primary focus:ring-brand-blue-primary"
                />
                <span>
                  <span className="flex items-center gap-2 font-bold text-ui-textPrimary">
                    <DevicePhoneMobileIcon className="h-5 w-5" />
                    Entire package
                  </span>
                  <span className="mt-1 block text-sm text-ui-textMuted">
                    Export every active player in one package
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
                setDownloadedCount(null);
              }}
              disabled={loadingPackage}
            >
              <option value="">Choose a package</option>
              {packageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <div className="mt-2 min-h-6 text-sm" aria-live="polite">
              {loadingPackage ? (
                <span className="text-ui-textMuted">Loading package players...</span>
              ) : packageError ? (
                <span className="font-medium text-red-700" role="alert">{packageError}</span>
              ) : packageName ? (
                <span className="font-medium text-brand-blue-primary">
                  {exportData.contacts.length} contact{exportData.contacts.length === 1 ? '' : 's'} ready
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-ui-border bg-ui-softBg p-4">
          <p className="font-bold text-ui-textPrimary">
            {exportData.contacts.length} contact{exportData.contacts.length === 1 ? '' : 's'} will be downloaded
          </p>
          <p className="mt-1 text-sm text-ui-textMuted">
            Contact names use the format <strong>Player name — Package name</strong>. Numbers are saved in international format so WhatsApp can recognize them.
          </p>
          {exportData.invalidPhoneCount > 0 ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              {exportData.invalidPhoneCount} invalid or missing phone number{exportData.invalidPhoneCount === 1 ? '' : 's'} will be skipped.
            </p>
          ) : null}
          {exportData.duplicateCount > 0 ? (
            <p className="mt-1 text-sm text-ui-textMuted">
              {exportData.duplicateCount} exact duplicate{exportData.duplicateCount === 1 ? '' : 's'} will be skipped.
            </p>
          ) : null}
          {exportData.contacts.length > 0 ? (
            <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto text-sm text-ui-textMuted">
              {exportData.contacts.slice(0, 3).map((contact) => (
                <li key={`${contact.registrationId}-${contact.packageName}`}>
                  {contact.contactName} · {contact.phoneNumber}
                </li>
              ))}
              {exportData.contacts.length > 3 ? (
                <li>+ {exportData.contacts.length - 3} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <strong>On your phone:</strong> download the file, open it, choose “Add all contacts,” then open WhatsApp and search for the player’s name.
        </div>

        {downloadedCount !== null ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" aria-live="polite">
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
            Downloaded {downloadedCount} contact{downloadedCount === 1 ? '' : 's'}.
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-ui-border pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button
            onClick={handleDownload}
            disabled={!canDownload}
            leadingIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
          >
            Download contacts (.vcf)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
