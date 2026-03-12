'use client';

import { getApiBaseUrl } from '../../../lib/getApiBaseUrl';

export type InvoiceCreateResult = {
  number?: string;
  pdfPath?: string;
  description?: string;
};

const ROUTE_BASE_URL = getApiBaseUrl();

export function extractInvoicePdfPath(
  invoice: InvoiceCreateResult | null | undefined,
): string | null {
  if (typeof invoice?.pdfPath === 'string' && invoice.pdfPath.trim()) {
    return invoice.pdfPath;
  }

  if (typeof invoice?.description === 'string' && invoice.description.trim()) {
    try {
      const parsed = JSON.parse(invoice.description) as { pdfPath?: unknown };
      return typeof parsed.pdfPath === 'string' && parsed.pdfPath.trim()
        ? parsed.pdfPath
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function downloadInvoicePdf(
  invoice: InvoiceCreateResult | null | undefined,
): Promise<boolean> {
  const pdfPath = extractInvoicePdfPath(invoice);
  if (!pdfPath) return false;

  const baseUrl = pdfPath.startsWith('/api/')
    ? (typeof window !== 'undefined' ? window.location.origin : '')
    : ROUTE_BASE_URL;
  const response = await fetch(baseUrl + pdfPath, { cache: 'no-store' });
  if (!response.ok) return false;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice?.number || 'invoice'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
