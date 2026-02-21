import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

/**
 * Landing package registrations: submit goes DIRECTLY to the database (same DB as portal).
 * Registration submit → DB → shows in Registrations in portal. No API involved.
 * DATABASE_URL is required (returns 503 if missing).
 */

/** Insert registration directly into the database (no API). Only runs when DATABASE_URL is set; avoids loading Prisma otherwise. */
async function createRegistrationInDb(payload: {
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAge?: number | null;
}): Promise<{ id: string } | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const { prisma } = await import('../../../lib/db');
    const basePriceJod = Math.max(0, await getBasePriceJod(prisma, payload.packageName));
    const finalPriceJod = basePriceJod;
    const row = await prisma.packageRegistration.create({
      data: {
        packageName: payload.packageName,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail?.trim() || null,
        customerAge: payload.customerAge ?? null,
        basePriceJod,
        discountType: 'NONE',
        discountValue: null,
        discountReason: null,
        finalPriceJod,
      },
      select: { id: true },
    });
    return { id: row.id };
  } catch (e) {
    const err = e as Error;
    console.error('[package-registrations] DB create failed:', err?.message, err?.name);
    return null;
  }
}

async function getBasePriceJod(
  prisma: { package: { findUnique: (args: { where: { name: string } }) => Promise<{ currentPriceJod: number | null } | null> }; packagePricing: { findUnique: (args: { where: { packageName: string } }) => Promise<{ basePriceJod: number | null } | null> } },
  packageName: string
): Promise<number> {
  const pkg = await prisma.package.findUnique({ where: { name: packageName } }).catch(() => null);
  if (pkg?.currentPriceJod != null) return pkg.currentPriceJod;
  const pricing = await prisma.packagePricing.findUnique({ where: { packageName } }).catch(() => null);
  return pricing?.basePriceJod ?? 0;
}

export async function POST(request: Request) {
  try {
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
        { status: 400 }
      );
    }

    const payload = {
      packageName: packageName.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : undefined,
      customerAge: typeof customerAge === 'number' && customerAge > 0 ? customerAge : undefined,
    };

    // Only path: write directly to DB. Same DB as portal → shows in Registrations in portal. No API.
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Registration is unavailable. Please try again later or contact us.' },
        { status: 503 }
      );
    }

    const dbResult = await createRegistrationInDb(payload).catch((e) => {
      console.warn('[package-registrations] DB create failed:', (e as Error)?.message);
      return null;
    });
    if (dbResult) {
      return NextResponse.json({ success: true, id: dbResult.id });
    }
    console.error('[package-registrations] DB create returned null – check logs above for Prisma/connection error');
    return NextResponse.json(
      { error: 'Unable to save registration. Please try again or contact us.' },
      { status: 500 }
    );
  } catch (e) {
    const err = e as Error;
    console.error('[package-registrations] Error:', err?.message);
    return NextResponse.json(
      { error: 'Unable to save registration. Please try again or contact us.' },
      { status: 500 }
    );
  }
}
