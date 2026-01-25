import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: 'DATABASE_URL is not set' },
      { status: 503 }
    );
  }

  try {
    await prisma.invoice.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }
    console.error('DELETE /api/invoices/[id] error:', e);
    return NextResponse.json(
      { message: e?.message || 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
