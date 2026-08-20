'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Button, Modal, Select } from '../../_components/ui';
import {
  packageRegistrationsApi,
  type PackageRegistrationRow,
} from '../../../lib/portalApi';
import {
  buildContacts,
  createVCardFile,
  safeFilenamePart,
} from './whatsappContactExport';

type AudienceType = 'selected' | 'package';

type BulkWhatsAppModalProps = {
  open: boolean;
  onClose: () => void;
  rows: PackageRegistrationRow[];
  selectedRegistrationIds: Set<string>;
  packageOptions: string[];
  defaultPackageName?: string;
};

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
  const [downloadedCount, setDownloadedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setAudience(selectedRegistrationIds.size > 0 ? 'selected' : 'package');
    setPackageName(defaultPackageName || packageOptions[0] || '');
    setPackageRows([]);
    setPackageCountError(null);
    setDownloadedCount(null);
  }, [defaultPackageName, open, packageOptions, selectedRegistrationIds.size]);

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
            : 'Could not load the package contacts.',
        );
      })
      .finally(() => {
        if (active) setLoadingPackageCount(false);
      });

    return () => {
      active = false;
    };
  }, [audience, open, packageName]);

  const sourceRows = audience === 'selected' ? selectedRows : packageRows;
  const exportSummary = useMemo(() => buildContacts(sourceRows), [sourceRows]);
  const canExport =
    exportSummary.contacts.length > 0 &&
    !loadingPackageCount &&
    !packageCountError;

  function handleExport() {
    if (!canExport) return;

    const vCard = createVCardFile(exportSummary.contacts);
    const blob = new Blob([vCard], { type: 'text/vcard;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const scope =
      audience === 'package'
        ? safeFilenamePart(packageName) || 'package'
        : 'selected-players';
    anchor.href = downloadUrl;
    anchor.download = `infinity-sports-whatsapp-${scope}-${new Date()
      .toISOString()
      .slice(0, 10)}.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
    setDownloadedCount(exportSummary.contacts.length);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export WhatsApp contacts"
      description="Create an Android-ready contact file from selected players or an entire package."
      size="lg"
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-ui-textPrimary">Choose contacts</legend>
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
                  name="whatsapp-export-audience"
                  value="selected"
                  checked={audience === 'selected'}
                  onChange={() => {
                    setAudience('selected');
                    setDownloadedCount(null);
                  }}
                  className="mt-1 h-4 w-4 border-ui-border text-emerald-600 focus:ring-emerald-600"
                />
                <span>
                  <span className="flex items-center gap-2 font-bold text-ui-textPrimary">
                    <UserGroupIcon className="h-5 w-5" />
                    Selected players
                  </span>
                  <span className="mt-1 block text-sm text-ui-textMuted">
                    {selectedRows.length
                      ? `${selectedRows.length} selected registration${selectedRows.length === 1 ? '' : 's'}`
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
                  name="whatsapp-export-audience"
                  value="package"
                  checked={audience === 'package'}
                  onChange={() => {
                    setAudience('package');
                    setDownloadedCount(null);
                  }}
                  className="mt-1 h-4 w-4 border-ui-border text-emerald-600 focus:ring-emerald-600"
                />
                <span>
                  <span className="flex items-center gap-2 font-bold text-ui-textPrimary">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
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
              disabled={loadingPackageCount}
            >
              <option value="">Choose a package</option>
              {packageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="rounded-xl border border-ui-border bg-ui-softBg px-4 py-4 text-sm">
          {loadingPackageCount ? (
            <p className="text-ui-textMuted">Preparing package contacts...</p>
          ) : packageCountError ? (
            <p className="font-medium text-red-700">{packageCountError}</p>
          ) : (
            <div className="space-y-1">
              <p className="font-bold text-ui-textPrimary">
                {exportSummary.contacts.length} valid WhatsApp contact
                {exportSummary.contacts.length === 1 ? '' : 's'} ready
              </p>
              <p className="text-ui-textMuted">
                Phone numbers will be saved in international format, for example +9627XXXXXXXX.
              </p>
              {exportSummary.invalidPhoneCount > 0 ? (
                <p className="font-medium text-amber-700">
                  {exportSummary.invalidPhoneCount} invalid or missing phone number
                  {exportSummary.invalidPhoneCount === 1 ? '' : 's'} will be skipped.
                </p>
              ) : null}
              {exportSummary.duplicatePhoneCount > 0 ? (
                <p className="text-ui-textMuted">
                  {exportSummary.duplicatePhoneCount} duplicate registration
                  {exportSummary.duplicatePhoneCount === 1 ? '' : 's'} consolidated by phone number.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-bold">How to use the file on Android</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Download the VCF file and transfer it to the Android phone.</li>
            <li>Open Contacts, choose Import from file, and select the VCF file.</li>
            <li>Open WhatsApp and use the imported contacts for messages or a broadcast list.</li>
          </ol>
        </div>

        {exportSummary.invalidPhoneCount > 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Review the skipped players and correct their phone numbers before exporting again.</p>
          </div>
        ) : null}

        {downloadedCount != null ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
            <p className="font-medium">
              Downloaded {downloadedCount} contact{downloadedCount === 1 ? '' : 's'} in Android VCF format.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-ui-border pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            leadingIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
            className="border-emerald-700 bg-emerald-700 hover:bg-emerald-800"
          >
            Download {exportSummary.contacts.length} contact
            {exportSummary.contacts.length === 1 ? '' : 's'} (.vcf)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
