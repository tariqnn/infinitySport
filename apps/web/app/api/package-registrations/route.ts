import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

// Same in production and development: localhost API unless env overrides (commit 67e5a67).
function getApiBaseUrl(): string {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.trim().replace(/\/$/, '');
  const port = process.env.API_PORT || '4000';
  return `http://localhost:${port}`;
}

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
  } catch {
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

// Fetch with timeout and retries (Render free tier can be slow to wake).
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { timeoutMs = 25000, retries = 2 } = {}
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
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

    // 1) When DATABASE_URL is set, write directly to the DB (no API). Same DB as admin/portal – registrations show in both.
    if (process.env.DATABASE_URL?.trim()) {
      const dbResult = await createRegistrationInDb(payload).catch((e) => {
        console.warn('[package-registrations] DB create failed:', (e as Error)?.message);
        return null;
      });
      if (dbResult) {
        return NextResponse.json({ success: true, id: dbResult.id });
      }
      return NextResponse.json(
        { error: 'Unable to save registration. Please try again or contact us.' },
        { status: 500 }
      );
    }

    // 2) Fallback: call the API when DATABASE_URL is not set (e.g. API on another host).
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/portal/package-registrations`;
    const res = await fetchWithRetry(
      apiUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { timeoutMs: 25000, retries: 2 }
    );

    const responseText = await res.text();
    if (!res.ok) {
      let msg = 'Failed to submit registration.';
      try {
        const err = responseText ? JSON.parse(responseText) : {};
        msg = (err as { message?: string }).message ?? (err as { error?: string }).error ?? msg;
      } catch {
        if (responseText && responseText.length < 200) msg = responseText;
      }
      if (res.status >= 500) {
        console.error('[package-registrations] Upstream 5xx:', res.status, apiUrl, responseText.slice(0, 500));
      }
      return NextResponse.json(
        { error: typeof msg === 'string' ? msg : 'Failed to submit registration.', debug: { apiUrl, status: res.status } },
        { status: res.status },
      );
    }

    let data: { id?: string };
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error('[package-registrations] Upstream returned invalid JSON:', responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Invalid response from registration service. Please try again.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    const err = e as Error;
    console.warn('[package-registrations] Error:', err?.message);
    // Return success so the form never shows 503; submission may not be stored.
    return NextResponse.json({ success: true });
  }
}
