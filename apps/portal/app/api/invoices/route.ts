import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { generateInvoicePdf } from '../../../lib/generateInvoicePdf';

function getCompanyId(body: unknown): string | null {
  const o = body && typeof body === 'object' && (body as Record<string, unknown>).company;
  if (o && typeof o === 'object' && (o as Record<string, unknown>).connect) {
    const id = (o as { connect?: { id?: unknown } }).connect?.id;
    if (id && typeof id === 'string' && id.trim()) return id.trim();
  }
  return null;
}

function getMemberId(body: Record<string, unknown>): string | null {
  const o = body.member;
  if (o && typeof o === 'object' && (o as Record<string, unknown>).connect) {
    const id = (o as { connect?: { id?: unknown } }).connect?.id;
    if (id && typeof id === 'string' && id.trim()) return id.trim();
  }
  return null;
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await prisma.invoice.count({ where: { number: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: 'DATABASE_URL is not set. Copy it from the project root .env into apps/portal/.env.local' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const companyId = getCompanyId(body);
  if (!companyId) {
    return NextResponse.json({ message: 'company.connect.id is required' }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ message: 'Company not found' }, { status: 400 });
  }

  const memberId = getMemberId(body);
  const amount = Math.round(Number(body.amount)) || 0;
  const currency = (body.currency && String(body.currency)) || 'JOD';
  const statusVal = (body.status && String(body.status)) || 'DRAFT';
  const status = ['DRAFT', 'SENT', 'PAID', 'OVERDUE'].includes(statusVal) ? statusVal : 'DRAFT';
  const issuedAtRaw = body.issuedAt ? new Date(String(body.issuedAt)) : new Date();
  const issuedAt = Number.isNaN(issuedAtRaw.getTime()) ? new Date() : issuedAtRaw;
  const dueRaw = body.dueDate ? new Date(String(body.dueDate)) : null;
  const dueDate = dueRaw && !Number.isNaN(dueRaw.getTime()) ? dueRaw : null;

  const meta = {
    v: 1,
    companyName: (body.companyName && String(body.companyName)) || 'Infinity Sporty',
    companyAddress: (body.companyAddress && String(body.companyAddress)) || '',
    clientName: (body.clientName && String(body.clientName)) || '',
    clientEmail: (body.clientEmail && String(body.clientEmail)) || '',
    clientAddress: (body.clientAddress && String(body.clientAddress)) || '',
    currency,
    paymentMethod: body.paymentMethod === 'CASH' ? 'CASH' : 'CARD',
    lineItems: Array.isArray(body.lineItems) ? body.lineItems : [],
    subtotal: typeof body.subtotal === 'number' ? body.subtotal : null,
    tax: typeof body.tax === 'number' ? body.tax : null,
    discount: typeof body.discount === 'number' ? body.discount : null,
    notes: (body.notes && String(body.notes)) || null,
    pdfPath: null as string | null,
  };

  const number = (body.number && String(body.number).trim()) || (await generateInvoiceNumber());

  try {
    const created = await prisma.invoice.create({
      data: {
        number,
        amount,
        currency,
        status: status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE',
        issuedAt,
        dueDate,
        description: JSON.stringify(meta),
        companyId,
        ...(memberId ? { memberId } : {}),
      },
    });

    let pdfPath: string | undefined;
    try {
      await generateInvoicePdf({ number, issuedAt, dueDate, currency, amount, meta });
      pdfPath = `/api/invoices/${created.id}/pdf`;
      await prisma.invoice.update({
        where: { id: created.id },
        data: { description: JSON.stringify({ ...meta, pdfPath }) },
      });
    } catch (pdfErr) {
      console.error('generateInvoicePdf error:', pdfErr);
    }
    return NextResponse.json({ ...created, ...(pdfPath ? { pdfPath, description: JSON.stringify({ ...meta, pdfPath }) } : {}) });
  } catch (e) {
    console.error('POST /api/invoices error:', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
