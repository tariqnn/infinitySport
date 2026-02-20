import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

// Production: never call localhost. Local dev defaults to 127.0.0.1:4000.
function getApiBaseUrl(): string | null {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  const base = envUrl && envUrl.trim() ? envUrl.trim().replace(/\/$/, '') : null;
  // In production, never use localhost/127.0.0.1 (API is not deployed there)
  if (process.env.NODE_ENV === 'production') {
    if (!base) return null;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) return null;
    return base;
  }
  return base ?? `http://127.0.0.1:${process.env.API_PORT || '4000'}`;
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

    const baseUrl = getApiBaseUrl();
    const payload = {
      packageName: packageName.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : undefined,
      customerAge: typeof customerAge === 'number' && customerAge > 0 ? customerAge : undefined,
    };

    if (!baseUrl) {
      // Production with no API: show success so form says "Submitted". API not deployed / runs only locally.
      console.warn('[package-registrations] No API URL; accepting submission and returning success (data not stored).');
      return NextResponse.json({ success: true });
    }

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
    // API unreachable (e.g. not running): still show "Submitted" so form never errors. No email.
    const err = e as Error & { cause?: { code?: string } };
    const baseUrl = getApiBaseUrl();
    const apiUrl = baseUrl ? `${baseUrl}/api/portal/package-registrations` : '(API_BASE_URL not set)';
    console.warn('[package-registrations] API unreachable, returning success anyway:', err?.message, 'apiUrl:', apiUrl);
    return NextResponse.json({ success: true });
  }
}
