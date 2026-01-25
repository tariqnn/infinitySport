import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { prisma } from '../../../../../lib/prisma';
import { generateInvoicePdf } from '../../../../../lib/generateInvoicePdf';

function parseMeta(description: string | null): Record<string, unknown> {
  if (!description || typeof description !== 'string') return {};
  try {
    const p = JSON.parse(description);
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });

  const safe = invoice.number.replace(/[^A-Za-z0-9-_]/g, '_');
  const filePath = join(process.cwd(), 'uploads', 'invoices', `${safe}.pdf`);

  // Generate PDF on demand if the file does not exist (e.g. invoice from Nest API, or PDF failed at create)
  if (!existsSync(filePath)) {
    try {
      const meta = parseMeta(invoice.description) as {
        companyName?: string;
        companyAddress?: string;
        clientName?: string;
        clientEmail?: string;
        clientAddress?: string;
        paymentMethod?: string;
        lineItems?: Array<{ description?: string; quantity?: number; unitPrice?: number; lineTotal?: number }>;
        subtotal?: number | null;
        tax?: number | null;
        discount?: number | null;
        notes?: string | null;
      };
      await generateInvoicePdf({
        number: invoice.number,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        amount: Number(invoice.amount) || 0,
        meta,
      });
    } catch (err) {
      console.error('PDF on-demand generation failed for invoice', invoice.id, err);
      return NextResponse.json({ message: 'PDF not found and could not be generated' }, { status: 404 });
    }
  }

  const buf = await readFile(filePath);
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
