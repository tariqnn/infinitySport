/// <reference lib="es2022" />
import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

// Default: local API only. Set API_BASE_URL / NEXT_PUBLIC_API_BASE_URL if API is elsewhere.
const getApiBaseUrl = () => {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return `http://localhost:${process.env.API_PORT || '4000'}`;
};

const API_BASE_URL = getApiBaseUrl();

type CourtType = 'Basketball AC' | 'Basketball 3x3' | 'Padel' | 'Volleyball';
const courtTypeForId = (courtId: string): CourtType | null => {
  if (courtId === 'basketball-ac') return 'Basketball AC';
  if (courtId === 'basketball-3x3') return 'Basketball 3x3';
  if (courtId === 'padel') return 'Padel';
  if (courtId === 'volleyball') return 'Volleyball';
  return null;
};

const dayKey = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
};

/** When DATABASE_URL is set, read blocked slots from DB. */
async function fetchBlockedMapFromDb(): Promise<Record<string, Partial<Record<CourtType, string[]>>>> {
  const { prisma } = await import('../../../lib/db');
  const rows = await prisma.blockedSlot.findMany({
    where: { isBlocked: true },
    select: { dayOfWeek: true, courtType: true, time: true },
  });
  const blocked: Record<string, Record<string, string[]>> = {};
  for (const r of rows) {
    if (!blocked[r.dayOfWeek]) blocked[r.dayOfWeek] = {};
    if (!blocked[r.dayOfWeek][r.courtType]) blocked[r.dayOfWeek][r.courtType] = [];
    blocked[r.dayOfWeek][r.courtType].push(r.time);
  }
  return blocked;
}

async function sendBookingWhatsAppMessage(data: {
  phone: string;
  courtName: string;
  date: string;
  time: string;
}) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

  if (!sid || !token || !from) return;
  if (!data.phone?.startsWith('+')) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${data.phone}`,
    Body: `Infinity Sports: Booking received.\nCourt: ${data.courtName}\nDate: ${data.date}\nTime: ${data.time}`,
  });

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
}

// Simple email sending function (you can replace this with a real email service)
async function sendBookingConfirmationEmail(data: {
  name: string;
  phone: string;
  email?: string;
  courtName: string;
  date: string;
  time: string;
}) {
  // For now, we'll just log the email. In production, integrate with:
  // - Resend (https://resend.com)
  // - SendGrid (https://sendgrid.com)
  // - Nodemailer with SMTP
  // - AWS SES
  
  const emailContent = {
    to: process.env.BOOKING_NOTIFICATION_EMAIL || 'hello@infinitysport.jo',
    subject: `New Court Booking - ${data.courtName}`,
    html: `
      <h2>New Court Booking Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Court:</strong> ${data.courtName}</p>
      <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Time:</strong> ${data.time}</p>
      <hr>
      <p>Please confirm this booking with the customer.</p>
    `,
    text: `
New Court Booking Request

Name: ${data.name}
Phone: ${data.phone}
Court: ${data.courtName}
Date: ${new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${data.time}

Please confirm this booking with the customer.
    `.trim(),
  };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('📧 Booking email (not sent - RESEND_API_KEY missing):', emailContent);
    return emailContent;
  }

  // Send admin notification
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.BOOKING_FROM_EMAIL || 'Infinity Sport <bookings@infinitysports.jo>',
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    }),
  });

  // Send customer confirmation if provided
  if (data.email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.BOOKING_FROM_EMAIL || 'Infinity Sport <bookings@infinitysports.jo>',
        to: [data.email],
        subject: `Booking received - ${data.courtName}`,
        html: `
          <h2>Your booking request is received</h2>
          <p>Hi ${data.name},</p>
          <p>We received your booking request:</p>
          <ul>
            <li><strong>Court:</strong> ${data.courtName}</li>
            <li><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li><strong>Time:</strong> ${data.time}</li>
          </ul>
          <p>We will contact you to confirm.</p>
        `,
        text: `Booking received\n\nCourt: ${data.courtName}\nDate: ${new Date(data.date).toLocaleDateString()}\nTime: ${data.time}\n\nWe will contact you to confirm.`,
      }),
    });
  }

  return emailContent;
}

async function fetchBlockedMap(): Promise<Record<string, Partial<Record<CourtType, string[]>>>> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      return await fetchBlockedMapFromDb();
    } catch {
      return {};
    }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/portal/blocked-slots`, { cache: 'no-store' });
    if (!res.ok) return {};
    const rows: { dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }[] = await res.json();
    const blocked: Record<string, Record<string, string[]>> = {};
    for (const r of rows) {
      if (!r.isBlocked) continue;
      if (!blocked[r.dayOfWeek]) blocked[r.dayOfWeek] = {};
      if (!blocked[r.dayOfWeek][r.courtType]) blocked[r.dayOfWeek][r.courtType] = [];
      blocked[r.dayOfWeek][r.courtType].push(r.time);
    }
    return blocked;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courtId, courtName, date, time, duration, name, phone, email } = body ?? {};

    // Validate required fields
    if (!courtId || !courtName || !date || !time || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields. Please fill in all fields.' },
        { status: 400 }
      );
    }

    const durationHours = typeof duration === 'number' && duration > 0 ? Math.min(3, Math.max(0.5, duration)) : 1;

    // Validate phone number (server-side validation)
    const phoneValidation = isValidPhoneNumber(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Invalid phone number. Please enter a valid phone number.' },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return NextResponse.json(
        { error: 'Cannot book a date in the past.' },
        { status: 400 }
      );
    }

    // Reject if any slot in [time, time + duration] is blocked in admin (Booking Availability).
    const courtType = courtTypeForId(courtId);
    if (courtType) {
      const blockedMap = await fetchBlockedMap();
      const day = dayKey(date);
      const fullTimes = blockedMap[day]?.[courtType] ?? [];
      const slotCount = Math.ceil(durationHours);
      for (let i = 0; i < slotCount; i++) {
        const [h, m] = time.split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0) + i * 60;
        const slotH = Math.floor(mins / 60) % 24;
        const slotM = mins % 60;
        const slotTime = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
        if (fullTimes.includes(slotTime)) {
          return NextResponse.json(
            { error: 'This time slot is fully booked. Please select another time.' },
            { status: 409 }
          );
        }
      }
    }

    // Compute end time from start + duration
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + Math.round(durationHours * 60));

    // Check for overlapping existing bookings (all companies – same venue)
    const courtType = courtTypeForId(courtId);
    if (courtType) {
      let hasConflict = false;
      if (process.env.DATABASE_URL?.trim()) {
        try {
          const { prisma } = await import('../../../lib/db');
          const existing = await prisma.booking.findMany({
            where: {
              startTime: { lt: endTime },
              endTime: { gt: startTime },
              status: { not: 'CANCELLED' },
              facilityArea: { in: [courtType, courtName] },
            },
            select: { id: true },
          });
          hasConflict = existing.length > 0;
        } catch (checkError) {
          console.error('Error checking existing bookings (DB):', checkError);
        }
      } else {
        try {
          const bookingsRes = await fetch(
            `${API_BASE_URL}/api/portal/bookings?startDate=${new Date(startTime.getTime() - 24 * 60 * 60 * 1000).toISOString()}&endDate=${new Date(endTime.getTime() + 24 * 60 * 60 * 1000).toISOString()}`,
            { cache: 'no-store' }
          );
          if (bookingsRes.ok) {
            const existingBookings: Array<{
              facilityArea: string | null;
              startTime: string;
              endTime: string;
              status: string;
            }> = await bookingsRes.json();
            hasConflict = existingBookings.some((b) => {
              if (b.status === 'CANCELLED') return false;
              if (b.facilityArea !== courtType && b.facilityArea !== courtName) return false;
              const bStart = new Date(b.startTime).getTime();
              const bEnd = new Date(b.endTime || b.startTime).getTime();
              const reqStart = startTime.getTime();
              const reqEnd = endTime.getTime();
              return reqStart < bEnd && reqEnd > bStart;
            });
          }
        } catch (checkError) {
          console.error('Error checking existing bookings:', checkError);
        }
      }
      if (hasConflict) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another time.' },
          { status: 409 }
        );
      }
    }

    // Send confirmation email (include duration in message)
    const endTimeStr = endTime.toTimeString().slice(0, 5);
    try {
      await sendBookingConfirmationEmail({
        name,
        phone,
        email: typeof email === 'string' ? email : undefined,
        courtName,
        date,
        time: `${time} – ${endTimeStr} (${durationHours}h)`,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    try {
      await sendBookingWhatsAppMessage({ phone, courtName, date, time: `${time} – ${endTimeStr}` });
    } catch (whatsAppError) {
      console.error('WhatsApp sending error:', whatsAppError);
    }

    // Save booking to database (same DB as API). Reflects in admin and portal when they call the API.
    const courtTypeForBooking = courtTypeForId(courtId);
    if (process.env.DATABASE_URL?.trim()) {
      try {
        const { prisma } = await import('../../../lib/db');
        // Use same company as portal (newest first) so landing-page bookings show in portal and admin
        let company = await prisma.company.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, select: { id: true } });
        if (!company) {
          company = await prisma.company.create({
            data: {
              name: 'Infinity Sport',
              contactName: 'Infinity Sport',
              contactEmail: 'infinitysportsacademyjo@gmail.com',
              phone: null,
              status: 'ACTIVE',
            },
            select: { id: true },
          });
        }
        await prisma.booking.create({
          data: {
            companyId: company.id,
            facilityArea: courtTypeForBooking || courtName,
            startTime: startTime,
            endTime: endTime,
            status: 'PENDING',
            isPaid: false,
            customerName: name,
            customerPhone: phone,
            customerEmail: typeof email === 'string' ? email : undefined,
            notes: 'Public booking from landing page',
          },
        });
      } catch (dbError) {
        const err = dbError as Error;
        console.error('[booking] DB create failed:', err?.message ?? String(dbError));
        return NextResponse.json(
          { error: 'Failed to save booking. Please try again or contact us.' },
          { status: 500 }
        );
      }
    } else {
      try {
        const companiesRes = await fetch(`${API_BASE_URL}/api/portal/companies`, { cache: 'no-store' });
        let companies: Array<{ id: string }> = [];
        if (companiesRes.ok) companies = await companiesRes.json();
        let companyId: string;
        if (companies?.length > 0) {
          companyId = companies[0].id;
        } else {
          const createRes = await fetch(`${API_BASE_URL}/api/portal/companies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Infinity Sport',
              contactName: 'Infinity Sport',
              contactEmail: 'infinitysportsacademyjo@gmail.com',
              status: 'ACTIVE',
            }),
          });
          if (!createRes.ok) throw new Error('Failed to create company');
          const newCompany = await createRes.json();
          companyId = newCompany.id;
        }
        const bookingRes = await fetch(`${API_BASE_URL}/api/portal/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: { connect: { id: companyId } },
            facilityArea: courtTypeForBooking || courtName,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            status: 'PENDING',
            isPaid: false,
            customerName: name,
            customerPhone: phone,
            customerEmail: typeof email === 'string' ? email : undefined,
            notes: 'Public booking from landing page',
          }),
        });
        if (!bookingRes.ok) {
          const errorData = await bookingRes.json().catch(() => ({}));
          console.error('Failed to create booking:', errorData);
          throw new Error('Failed to save booking to database');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking submitted successfully. You will receive a confirmation email shortly.',
    });
  } catch (error) {
    console.error('Booking submission error', error);
    return NextResponse.json(
      { error: 'Unable to process your booking. Please try again later.' },
      { status: 500 }
    );
  }
}





