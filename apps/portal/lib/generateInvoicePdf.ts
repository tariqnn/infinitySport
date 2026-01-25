import { PDFDocument, StandardFonts, rgb, PageSizes, degrees } from 'pdf-lib';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const MARGIN = 48;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

type LineItem = { description?: string; quantity?: number; unitPrice?: number; lineTotal?: number };

export type GenerateInvoicePdfInput = {
  number: string;
  issuedAt: Date;
  dueDate: Date | null;
  currency: string;
  amount: number;
  meta: {
    companyName?: string;
    companyAddress?: string;
    clientName?: string;
    clientEmail?: string;
    clientAddress?: string;
    paymentMethod?: string;
    lineItems?: LineItem[];
    subtotal?: number | null;
    tax?: number | null;
    discount?: number | null;
    notes?: string | null;
  };
};

function money(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

// PDF y=0 is bottom; fromTop = distance from top of page
function y(fromTop: number) { return PAGE_H - fromTop; }

// Right-align text in a column ending at xEnd
function xRight(font: { widthOfTextAtSize: (t: string, s: number) => number }, text: string, size: number, xEnd: number): number {
  return xEnd - font.widthOfTextAtSize(text, size);
}

export async function generateInvoicePdf(input: GenerateInvoicePdfInput): Promise<string> {
  const dir = join(process.cwd(), 'uploads', 'invoices');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const safeNumber = input.number.replace(/[^A-Za-z0-9-_]/g, '_');
  const filename = `${safeNumber}.pdf`;
  const absolutePath = join(dir, filename);

  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const m = input.meta || {};
  const companyName = m.companyName || 'Infinity Sporty';
  const companyAddress = m.companyAddress || '';

  // —— Palette: navy/charcoal + accent (sports academy, Stripe/Notion feel) ——
  const navy = rgb(0.06, 0.09, 0.16);           // #0f172a
  const charcoal = rgb(0.2, 0.25, 0.33);        // #334155
  const accent = rgb(0.15, 0.39, 0.92);         // #2563eb
  const muted = rgb(0.39, 0.45, 0.55);          // #64748b
  const bgCard = rgb(0.97, 0.98, 0.99);         // #f8fafc
  const bgTableHead = rgb(0.95, 0.96, 0.97);    // #f1f5f9
  const border = rgb(0.89, 0.91, 0.94);         // #e2e8f0
  const borderLight = rgb(0.93, 0.94, 0.96);    // #f1f5f9 / very soft

  let cursor = MARGIN;

  // ═══════════════════════════════════════════════════════════════════
  // HEADER — branded, strong
  // ═══════════════════════════════════════════════════════════════════

  const logoPaths = [
    join(process.cwd(), 'apps', 'web', 'public', 'infinity-logo.png'),
    join(process.cwd(), 'apps', 'portal', 'public', 'infinity-logo.png'),
  ];
  const logoPath = logoPaths.find((p) => existsSync(p));
  let hasLogo = false;
  if (logoPath) {
    try {
      const logoBytes = await readFile(logoPath);
      const img = await doc.embedPng(logoBytes);
      hasLogo = true;
      // Watermark — behind all content: centered, transparent, slightly rotated
      const w = 280;
      page.drawImage(img, {
        x: (PAGE_W - w) / 2,
        y: (PAGE_H - w) / 2,
        width: w,
        height: w,
        opacity: 0.1,
        rotate: degrees(-18),
      });
      // Header logo
      page.drawImage(img, { x: MARGIN, y: y(cursor + 52), width: 52, height: 52 });
    } catch {}
  }

  // Company name — large, navy, bold (brand presence)
  page.drawText(companyName.toUpperCase(), {
    x: hasLogo ? 116 : MARGIN,
    y: y(cursor) - 16,
    size: 20,
    font: fontBold,
    color: navy,
  });
  if (companyAddress) {
    page.drawText(companyAddress, {
      x: hasLogo ? 116 : MARGIN,
      y: y(cursor + 22) - 9,
      size: 9,
      font: font,
      color: muted,
    });
  }

  // Accent line under header (1.5pt, full width)
  const headerBottom = cursor + (hasLogo ? 64 : 48);
  page.drawLine({
    start: { x: MARGIN, y: y(headerBottom) },
    end: { x: PAGE_W - MARGIN, y: y(headerBottom) },
    thickness: 1.5,
    color: accent,
  });
  cursor = headerBottom + 20;

  // Invoice info card — subtle bg, light border, grouped
  const cardW = 200;
  const cardH = 76;
  const cardX = PAGE_W - MARGIN - cardW;
  page.drawRectangle({
    x: cardX,
    y: y(cursor + cardH),
    width: cardW,
    height: cardH,
    color: bgCard,
    borderColor: border,
    borderWidth: 0.5,
  });
  page.drawText('INVOICE', { x: cardX + 14, y: y(cursor + 18) - 11, size: 11, font: fontBold, color: accent });
  page.drawText(input.number, { x: cardX + 14, y: y(cursor + 34) - 10, size: 12, font: fontBold, color: navy });
  const issued = input.issuedAt ? new Date(input.issuedAt) : new Date();
  const due = input.dueDate ? new Date(input.dueDate) : null;
  page.drawText(`Issued ${issued.toLocaleDateString()}`, { x: cardX + 14, y: y(cursor + 52) - 9, size: 9, font: font, color: muted });
  page.drawText(`Due ${due ? due.toLocaleDateString() : '—'}`, { x: cardX + 14, y: y(cursor + 68) - 9, size: 9, font: font, color: muted });

  cursor += cardH + 32;

  // ═══════════════════════════════════════════════════════════════════
  // BILL TO — left accent bar, clear hierarchy
  // ═══════════════════════════════════════════════════════════════════

  page.drawRectangle({ x: MARGIN, y: y(cursor + 56), width: 3, height: 56, color: accent });
  page.drawText('BILL TO', { x: MARGIN + 14, y: y(cursor) - 10, size: 9, font: fontBold, color: navy });
  cursor += 16;
  const clientName = m.clientName || '';
  const clientEmail = m.clientEmail || '';
  const clientAddress = m.clientAddress || '';
  if (clientName) {
    page.drawText(clientName, { x: MARGIN + 14, y: y(cursor) - 11, size: 11, font: font, color: navy });
    cursor += 14;
  }
  if (clientEmail) {
    page.drawText(clientEmail, { x: MARGIN + 14, y: y(cursor) - 9, size: 9, font: font, color: muted });
    cursor += 12;
  }
  if (clientAddress) {
    page.drawText(clientAddress, { x: MARGIN + 14, y: y(cursor) - 9, size: 9, font: font, color: muted });
    cursor += 12;
  }
  cursor += 28;

  // ═══════════════════════════════════════════════════════════════════
  // ITEMS TABLE — modern: light header bg, alternating rows, soft borders
  // ═══════════════════════════════════════════════════════════════════

  const items: LineItem[] = Array.isArray(m.lineItems) ? m.lineItems : [];
  const cDesc = MARGIN + 12;
  const cQty = MARGIN + 298;
  const cUnit = MARGIN + 348;
  const cAmountEnd = PAGE_W - MARGIN - 14;
  const cUnitEnd = cAmountEnd - 70;
  const rowH = 28;
  const headH = 36;

  // Table header — subtle background
  page.drawRectangle({
    x: MARGIN,
    y: y(cursor + headH),
    width: CONTENT_W,
    height: headH,
    color: bgTableHead,
  });
  page.drawLine({ start: { x: MARGIN, y: y(cursor + headH) }, end: { x: PAGE_W - MARGIN, y: y(cursor + headH) }, thickness: 0.5, color: border });
  page.drawText('Description', { x: cDesc, y: y(cursor + 14) - 10, size: 10, font: fontBold, color: navy });
  page.drawText('Qty', { x: cQty, y: y(cursor + 14) - 10, size: 10, font: fontBold, color: navy });
  page.drawText('Unit price', { x: cUnit, y: y(cursor + 14) - 10, size: 10, font: fontBold, color: navy });
  page.drawText('Amount', { x: xRight(fontBold, 'Amount', 10, cAmountEnd), y: y(cursor + 14) - 10, size: 10, font: fontBold, color: navy });
  cursor += headH;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const rowBg = i % 2 === 1 ? bgCard : rgb(1, 1, 1);
    page.drawRectangle({ x: MARGIN, y: y(cursor + rowH), width: CONTENT_W, height: rowH, color: rowBg });
    page.drawLine({ start: { x: MARGIN, y: y(cursor) }, end: { x: PAGE_W - MARGIN, y: y(cursor) }, thickness: 0.25, color: borderLight });
    page.drawText(String(it.description || '—').slice(0, 65), { x: cDesc, y: y(cursor + 10) - 9, size: 9, font: font, color: charcoal });
    page.drawText(String(it.quantity ?? 0), { x: xRight(font, String(it.quantity ?? 0), 9, cUnit - 6), y: y(cursor + 10) - 9, size: 9, font: font, color: charcoal });
    page.drawText(money(Number(it.unitPrice) || 0), { x: xRight(font, money(Number(it.unitPrice) || 0), 9, cUnitEnd), y: y(cursor + 10) - 9, size: 9, font: font, color: charcoal });
    page.drawText(money(Number(it.lineTotal) || 0), { x: xRight(font, money(Number(it.lineTotal) || 0), 9, cAmountEnd), y: y(cursor + 10) - 9, size: 9, font: font, color: charcoal });
    cursor += rowH;
  }

  page.drawLine({ start: { x: MARGIN, y: y(cursor) }, end: { x: PAGE_W - MARGIN, y: y(cursor) }, thickness: 0.5, color: border });
  cursor += 28;

  // ═══════════════════════════════════════════════════════════════════
  // TOTALS — premium block: left accent bar, Total emphasized
  // ═══════════════════════════════════════════════════════════════════

  const subtotal = typeof m.subtotal === 'number' ? m.subtotal : items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
  const tax = Number(m.tax) || 0;
  const discount = Number(m.discount) || 0;
  const grandTotal = Number.isFinite(input.amount) ? input.amount : subtotal + tax - discount;
  const totBlockW = 220;
  const totX = PAGE_W - MARGIN - totBlockW;
  const totValX = PAGE_W - MARGIN - 75;

  page.drawText('Subtotal', { x: totX, y: y(cursor) - 9, size: 9, font: font, color: muted });
  page.drawText(money(subtotal), { x: xRight(font, money(subtotal), 9, totValX), y: y(cursor) - 9, size: 9, font: font, color: charcoal });
  cursor += 16;
  if (tax) {
    page.drawText('Tax', { x: totX, y: y(cursor) - 9, size: 9, font: font, color: muted });
    page.drawText(money(tax), { x: xRight(font, money(tax), 9, totValX), y: y(cursor) - 9, size: 9, font: font, color: charcoal });
    cursor += 16;
  }
  if (discount) {
    page.drawText('Discount', { x: totX, y: y(cursor) - 9, size: 9, font: font, color: muted });
    page.drawText(`-${money(discount)}`, { x: xRight(font, `-${money(discount)}`, 9, totValX), y: y(cursor) - 9, size: 9, font: font, color: charcoal });
    cursor += 16;
  }

  // Total row — accent left bar + subtle bg, bold
  const totalH = 40;
  page.drawRectangle({ x: totX, y: y(cursor + totalH), width: totBlockW, height: totalH, color: bgCard });
  page.drawRectangle({ x: totX, y: y(cursor + totalH), width: 4, height: totalH, color: accent });
  page.drawLine({ start: { x: totX, y: y(cursor + totalH) }, end: { x: PAGE_W - MARGIN, y: y(cursor + totalH) }, thickness: 0.5, color: border });
  page.drawText('Total', { x: totX + 16, y: y(cursor + 14) - 12, size: 12, font: fontBold, color: navy });
  const totalStr = `${input.currency || 'JOD'} ${money(grandTotal)}`;
  page.drawText(totalStr, { x: xRight(fontBold, totalStr, 12, PAGE_W - MARGIN - 14), y: y(cursor + 14) - 12, size: 12, font: fontBold, color: navy });
  cursor += totalH + 32;

  // ═══════════════════════════════════════════════════════════════════
  // PAYMENT & NOTES — soft card for notes
  // ═══════════════════════════════════════════════════════════════════

  if (m.paymentMethod) {
    page.drawText('Payment method', { x: MARGIN, y: y(cursor) - 9, size: 9, font: fontBold, color: navy });
    cursor += 12;
    page.drawText(m.paymentMethod === 'CASH' ? 'Cash' : 'Card', { x: MARGIN, y: y(cursor) - 9, size: 9, font: font, color: muted });
    cursor += 22;
  }

  if (m.notes && String(m.notes).trim()) {
    page.drawText('Notes', { x: MARGIN, y: y(cursor) - 9, size: 9, font: fontBold, color: navy });
    cursor += 14;
    const noteText = String(m.notes).trim().slice(0, 360);
    const noteH = 36;
    page.drawRectangle({ x: MARGIN, y: y(cursor + noteH), width: CONTENT_W, height: noteH, color: bgCard, borderColor: border, borderWidth: 0.5 });
    page.drawText(noteText, { x: MARGIN + 12, y: y(cursor + 10) - 9, size: 9, font: font, color: muted });
    cursor += noteH + 24;
  }

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER — subtle, centered feel
  // ═══════════════════════════════════════════════════════════════════

  const footerY = MARGIN + 14;
  page.drawLine({ start: { x: MARGIN, y: y(footerY + 18) }, end: { x: PAGE_W - MARGIN, y: y(footerY + 18) }, thickness: 0.25, color: borderLight });
  const thanks = 'Thank you for your business.';
  page.drawText(thanks, { x: (PAGE_W - font.widthOfTextAtSize(thanks, 8)) / 2, y: y(footerY) - 8, size: 8, font: font, color: muted });

  const pdfBytes = await doc.save();
  await writeFile(absolutePath, pdfBytes);
  return absolutePath;
}
