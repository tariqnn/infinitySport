import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

// Same in production and development: localhost API unless env overrides.
function getApiBaseUrl(): string {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const port = process.env.API_PORT || '4000';
  return `http://localhost:${port}`;
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

    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/portal/package-registrations`;
    const res = await fetch(apiUrl, {
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
    const err = e as Error & { cause?: { code?: string } };
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/portal/package-registrations`;
    const msg = err?.message ?? '';
    const causeCode = err.cause && typeof err.cause === 'object' && (err.cause as any).code;
    const reason = [msg, causeCode].filter(Boolean).join(' ') || 'unknown';
    console.error('[package-registrations] Error:', reason, 'apiUrl:', apiUrl, err);
    const isConnectionRefused = causeCode === 'ECONNREFUSED' || msg.includes('ECONNREFUSED');
    const isNetwork =
      isConnectionRefused ||
      (e instanceof TypeError && (msg === 'Failed to fetch' || msg.includes('fetch')));
    return NextResponse.json(
      {
        error: isNetwork
          ? 'Cannot reach the registration service. Make sure the API is running on port 4000.'
          : 'Unable to submit registration. Please try again later.',
        debug: { apiUrl, reason },
      },
      { status: 500 },
    );
  }
}
