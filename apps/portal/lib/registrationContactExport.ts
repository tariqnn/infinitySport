import type { PackageRegistrationRow } from './portalApi';

export type RegistrationContact = {
  registrationId: string;
  playerName: string;
  packageName: string;
  contactName: string;
  phoneNumber: string;
};

export type RegistrationContactExport = {
  contacts: RegistrationContact[];
  invalidPhoneCount: number;
  duplicateCount: number;
};

/** Normalize local Jordanian numbers and already-international numbers for phone contacts. */
export function normalizeContactPhone(value: string | null | undefined) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/\D/g, '');

  if (!digits) return null;
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!raw.startsWith('+') && !digits.startsWith('962')) {
    digits = digits.startsWith('0') ? `962${digits.slice(1)}` : `962${digits}`;
  }

  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

function cleanLabel(value: string, fallback: string) {
  return value.replace(/\s+/g, ' ').trim() || fallback;
}

function escapeVCardValue(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function prepareRegistrationContacts(
  rows: PackageRegistrationRow[],
): RegistrationContactExport {
  const contacts: RegistrationContact[] = [];
  const seen = new Set<string>();
  let invalidPhoneCount = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    const phoneNumber = normalizeContactPhone(row.customerPhone);
    if (!phoneNumber) {
      invalidPhoneCount += 1;
      continue;
    }

    const playerName = cleanLabel(row.customerName, 'Player');
    const packageName = cleanLabel(row.packageName, 'Package');
    const duplicateKey = `${phoneNumber}|${playerName.toLocaleLowerCase()}|${packageName.toLocaleLowerCase()}`;

    if (seen.has(duplicateKey)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(duplicateKey);
    contacts.push({
      registrationId: row.id,
      playerName,
      packageName,
      contactName: `${playerName} — ${packageName}`,
      phoneNumber,
    });
  }

  return { contacts, invalidPhoneCount, duplicateCount };
}

export function createRegistrationVCard(contacts: RegistrationContact[]) {
  return contacts
    .map((contact) => {
      const contactName = escapeVCardValue(contact.contactName);
      const playerName = escapeVCardValue(contact.playerName);
      const packageName = escapeVCardValue(contact.packageName);

      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${contactName}`,
        `N:${playerName};;;;`,
        `TEL;TYPE=CELL,VOICE:${contact.phoneNumber}`,
        `NOTE:Infinity Sports package: ${packageName}`,
        'END:VCARD',
      ].join('\r\n');
    })
    .join('\r\n');
}

export function contactExportFilename(audienceLabel: string) {
  const safeLabel = audienceLabel
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `infinity-sports-${safeLabel || 'players'}-${date}.vcf`;
}
