type WhatsAppContactSource = {
  customerName: string | null;
  customerPhone: string | null;
  packageName: string | null;
};

export type ExportContact = {
  customerName: string;
  phone: string;
  packageNames: string[];
};

function toAsciiDigits(value: string) {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  return Array.from(value, (character) => {
    const arabicIndex = arabicIndic.indexOf(character);
    if (arabicIndex >= 0) return String(arabicIndex);
    const easternIndex = easternArabicIndic.indexOf(character);
    if (easternIndex >= 0) return String(easternIndex);
    return character;
  }).join('');
}

/** Convert local Jordanian and international numbers to WhatsApp's E.164 format. */
export function normalizeWhatsAppPhone(value: string | null | undefined) {
  const raw = toAsciiDigits(String(value || '').trim());
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (raw.startsWith('+')) {
    // The number already includes its country code.
  } else if (digits.startsWith('962')) {
    // Jordanian number already includes its country code.
  } else if (digits.startsWith('0')) {
    digits = `962${digits.slice(1)}`;
  } else if (/^7\d{8}$/.test(digits)) {
    digits = `962${digits}`;
  }

  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

export function buildContacts(rows: WhatsAppContactSource[]) {
  const contactsByPhone = new Map<
    string,
    { customerName: string; packageNames: Set<string> }
  >();
  let invalidPhoneCount = 0;
  let duplicatePhoneCount = 0;

  for (const row of rows) {
    const phone = normalizeWhatsAppPhone(row.customerPhone);
    if (!phone) {
      invalidPhoneCount += 1;
      continue;
    }

    const customerName = String(row.customerName || '').trim() || 'Player';
    const packageName = String(row.packageName || '').trim();
    const existing = contactsByPhone.get(phone);
    if (existing) {
      duplicatePhoneCount += 1;
      if (packageName) existing.packageNames.add(packageName);
      continue;
    }

    contactsByPhone.set(phone, {
      customerName,
      packageNames: new Set(packageName ? [packageName] : []),
    });
  }

  const contacts: ExportContact[] = Array.from(contactsByPhone, ([phone, contact]) => ({
    customerName: contact.customerName,
    phone,
    packageNames: Array.from(contact.packageNames).sort(),
  })).sort((left, right) => left.customerName.localeCompare(right.customerName));

  return { contacts, invalidPhoneCount, duplicatePhoneCount };
}

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function contactDisplayName(contact: ExportContact) {
  const packages = contact.packageNames.join(' + ');
  return packages ? `${contact.customerName} - ${packages}` : contact.customerName;
}

export function createVCardFile(contacts: ExportContact[]) {
  return contacts
    .map((contact) => {
      const displayName = escapeVCard(contactDisplayName(contact));
      const packageNote = escapeVCard(
        contact.packageNames.length
          ? `Infinity Sports package: ${contact.packageNames.join(', ')}`
          : 'Infinity Sports player',
      );
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N;CHARSET=UTF-8:;${displayName};;;`,
        `FN;CHARSET=UTF-8:${displayName}`,
        `TEL;TYPE=CELL:${contact.phone}`,
        `NOTE;CHARSET=UTF-8:${packageNote}`,
        'CATEGORIES:Infinity Sports,WhatsApp',
        'END:VCARD',
      ].join('\r\n');
    })
    .join('\r\n');
}

export function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
