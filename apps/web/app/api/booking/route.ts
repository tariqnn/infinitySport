import { NextResponse } from 'next/server';

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

// Same schedule as the booking UI. NOTE: applies ONLY to Basketball AC.
const ALWAYS_FULL: Record<string, Partial<Record<CourtType, string[]>>> = {
  MONDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'] },
  WEDNESDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'] },
  FRIDAY: { 'Basketball AC': ['22:00', '23:00', '00:00'] },
  SATURDAY: { 'Basketball AC': ['17:00', '18:00'] },
};

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

    // TODO: Check if the time slot is already booked (query database)
    // For now, we'll accept all bookings
    // But we must always reject the configured "always full" slots.
    const courtType = courtTypeForId(courtId);
    if (courtType) {
      const day = dayKey(date);
      const fullTimes = ALWAYS_FULL[day]?.[courtType] ?? [];
      if (fullTimes.includes(time)) {
        return NextResponse.json(
          { error: 'This time slot is fully booked. Please select another time.' },
          { status: 409 }
        );
      }
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

    // TODO: Save booking to database
    // For now, we'll just return success
    // You can add database saving here:
    /*
    const booking = await prisma.booking.create({
      data: {
        companyId: 'default-company-id', // Or get from a default company
        facilityArea: courtName,
        startTime: new Date(`${date}T${time}`),
        endTime: new Date(`${date}T${parseInt(time.split(':')[0]) + 1}:00`),
        status: 'PENDING',
        notes: `Public booking - Name: ${name}, Phone: ${phone}`,
      },
    });
    */

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





