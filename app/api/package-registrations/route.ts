import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

function getApiBaseUrl(request: Request) {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'development') return 'http://localhost:4000';

  // When the API is deployed on the same server/domain (common in production),
  // proxy to the same origin so `/api/portal/*` can be served by the backend.
  if (process.env.NEXT_PUBLIC_API_SAME_DOMAIN === 'true') {
    return new URL(request.url).origin;
  }

  // Fallback: legacy deployed API host
  return 'https://infinitysport.onrender.com';
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

    const res = await fetch(`${getApiBaseUrl(request)}/api/portal/package-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageName: packageName.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : undefined,
        customerAge: typeof customerAge === 'number' && customerAge > 0 ? customerAge : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { message?: string }).message || 'Failed to submit registration.' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('Package registration error', e);
    return NextResponse.json(
      { error: 'Unable to submit registration. Please try again later.' },
      { status: 500 }
    );
  }
}
