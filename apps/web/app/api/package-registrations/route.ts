import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

async function getBasePriceJod(packageName: string): Promise<number> {
  const { prisma } = await import('../../../lib/db');

  const pkg = await prisma.package.findUnique({
    where: { name: packageName },
    select: { currentPriceJod: true },
  });
  if (pkg?.currentPriceJod != null) return Math.max(0, pkg.currentPriceJod);

  const pricing = await prisma.packagePricing.findUnique({
    where: { packageName },
    select: { basePriceJod: true },
  });
  return Math.max(0, pricing?.basePriceJod ?? 0);
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Registration is unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { packageName, customerName, customerPhone, customerEmail, customerAge } = body ?? {};

    if (!packageName || typeof packageName !== 'string' || !packageName.trim()) {
      return NextResponse.json({ error: 'Please select a package.' }, { status: 400 });
    }
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!customerPhone || typeof customerPhone !== 'string' || !customerPhone.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const phoneValidation = isValidPhoneNumber(customerPhone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Invalid phone number. Please enter a valid phone number.' },
        { status: 400 },
      );
    }

    const cleanPackage = packageName.trim();
    const basePriceJod = await getBasePriceJod(cleanPackage);

    const { prisma } = await import('../../../lib/db');
    const row = await prisma.packageRegistration.create({
      data: {
        packageName: cleanPackage,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : null,
        customerAge: typeof customerAge === 'number' && customerAge > 0 ? customerAge : null,
        basePriceJod,
        discountType: 'NONE',
        discountValue: null,
        discountReason: null,
        finalPriceJod: basePriceJod,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: row.id });
  } catch (error) {
    console.error('[package-registrations] error', error);
    return NextResponse.json(
      { error: 'Unable to save registration. Please try again or contact us.' },
      { status: 500 },
    );
  }
}
