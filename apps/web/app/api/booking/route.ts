import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';

// Default to deployed API, allow override via environment variable
const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // In development, default to localhost:4000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return 'https://infinitysport.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

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

const dayKey = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
};

type CourtType = 'Basketball AC' | 'Basketball 3x3' | 'Padel' | 'Volleyball';
const courtTypeForId = (courtId: string): CourtType | null => {
  if (courtId === 'basketball-ac') return 'Basketball AC';
  if (courtId === 'basketball-3x3') return 'Basketball 3x3';
  if (courtId === 'padel') return 'Padel';
  if (courtId === 'volleyball') return 'Volleyball';
  return null;
};

async function fetchBlockedMap(): Promise<Record<string, Partial<Record<CourtType, string[]>>>> {
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
    const { courtId, courtName, date, time, name, phone, email } = body ?? {};

    // Validate required fields
    if (!courtId || !courtName || !date || !time || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields. Please fill in all fields.' },
        { status: 400 }
      );
    }

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

    // Reject slots marked as blocked in admin (Booking Availability). Admin can set isBlocked=false to free them.
    const courtType = courtTypeForId(courtId);
    if (courtType) {
      const blockedMap = await fetchBlockedMap();
      const day = dayKey(date);
      const fullTimes = blockedMap[day]?.[courtType] ?? [];
      if (fullTimes.includes(time)) {
        return NextResponse.json(
          { error: 'This time slot is fully booked. Please select another time.' },
          { status: 409 }
        );
      }
    }

    // Check for existing bookings at this time slot
    try {
      const startTime = new Date(`${date}T${time}:00`);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      // Get first company (or create it)
      const companiesRes = await fetch(`${API_BASE_URL}/api/portal/companies`, {
        cache: 'no-store',
      });
      let companies: Array<{ id: string; name: string }> = [];
      if (companiesRes.ok) {
        companies = await companiesRes.json();
      }

      let companyId: string;
      if (companies && companies.length > 0) {
        companyId = companies[0].id;
      } else {
        // Create default company if none exists
        const createCompanyRes = await fetch(`${API_BASE_URL}/api/portal/companies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Infinity Sporty',
            contactName: 'Infinity Sporty',
            contactEmail: 'infinitysportsacademyjo@gmail.com',
            status: 'ACTIVE',
          }),
        });
        if (createCompanyRes.ok) {
          const newCompany = await createCompanyRes.json();
          companyId = newCompany.id;
        } else {
          throw new Error('Failed to create company');
        }
      }

        // Check for existing bookings at this time and court (all companies – same venue)
        const courtType = courtTypeForId(courtId);
        const bookingsRes = await fetch(
          `${API_BASE_URL}/api/portal/bookings?startDate=${startTime.toISOString()}&endDate=${endTime.toISOString()}`,
          { cache: 'no-store' }
        );
        if (bookingsRes.ok && courtType) {
          const existingBookings: Array<{
            facilityArea: string | null;
            startTime: string;
            status: string;
          }> = await bookingsRes.json();
          const conflictingBooking = existingBookings.find(
            (b) =>
              b.status !== 'CANCELLED' &&
              (b.facilityArea === courtType || b.facilityArea === courtName) &&
              new Date(b.startTime).getTime() === startTime.getTime()
          );
          if (conflictingBooking) {
            return NextResponse.json(
              { error: 'This time slot is already booked. Please select another time.' },
              { status: 409 }
            );
          }
        }
    } catch (checkError) {
      console.error('Error checking existing bookings:', checkError);
      // Continue with booking creation even if check fails
    }

    // Send confirmation email
    try {
      await sendBookingConfirmationEmail({
        name,
        phone,
        email: typeof email === 'string' ? email : undefined,
        courtName,
        date,
        time,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the booking if email fails, but log it
    }

    // Best-effort WhatsApp confirmation (requires Twilio WhatsApp credentials)
    try {
      await sendBookingWhatsAppMessage({ phone, courtName, date, time });
    } catch (whatsAppError) {
      console.error('WhatsApp sending error:', whatsAppError);
    }

    // Save booking to database
    try {
      const startTime = new Date(`${date}T${time}:00`);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      // Get or create company
      const companiesRes = await fetch(`${API_BASE_URL}/api/portal/companies`, {
        cache: 'no-store',
      });
      let companies: Array<{ id: string; name: string }> = [];
      if (companiesRes.ok) {
        companies = await companiesRes.json();
      }

      let companyId: string;
      if (companies && companies.length > 0) {
        companyId = companies[0].id;
      } else {
        // Create default company if none exists
        const createCompanyRes = await fetch(`${API_BASE_URL}/api/portal/companies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Infinity Sporty',
            contactName: 'Infinity Sporty',
            contactEmail: 'infinitysportsacademyjo@gmail.com',
            status: 'ACTIVE',
          }),
        });
        if (createCompanyRes.ok) {
          const newCompany = await createCompanyRes.json();
          companyId = newCompany.id;
        } else {
          throw new Error('Failed to create company');
        }
      }

      // Create booking (facilityArea = canonical courtType so it matches blocked/booked logic)
      const courtType = courtTypeForId(courtId);
      const bookingRes = await fetch(`${API_BASE_URL}/api/portal/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { connect: { id: companyId } },
          facilityArea: courtType || courtName,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: 'PENDING',
          isPaid: false,
          customerName: name,
          customerPhone: phone,
          customerEmail: typeof email === 'string' ? email : undefined,
          notes: `Public booking from landing page`,
        }),
      });

      if (!bookingRes.ok) {
        const errorData = await bookingRes.json().catch(() => ({}));
        console.error('Failed to create booking:', errorData);
        throw new Error('Failed to save booking to database');
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the booking if database save fails, but log it
      // The email/WhatsApp notifications were already sent
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





