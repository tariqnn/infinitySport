type BookingEmailInput = {
  to: string;
  customerName: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  bookingId: string;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function escapeHtml(value: unknown) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDuration(hours: number) {
  if (hours === 1) return '1 hour';
  if (hours === 1.5) return '1.5 hours';
  return `${hours} hours`;
}

function buildBookingEmail(input: BookingEmailInput) {
  const subject = `Booking received - ${input.courtName}`;
  const details = [
    `Court: ${input.courtName}`,
    `Date: ${input.date}`,
    `Time: ${input.startTime} - ${input.endTime}`,
    `Duration: ${formatDuration(input.durationHours)}`,
    `Booking ID: ${input.bookingId}`,
  ];

  const text = [
    `Hi ${input.customerName},`,
    '',
    'We received your booking request at Infinity Sport.',
    'Our team will review it and contact you if anything else is needed.',
    '',
    ...details,
    '',
    'Thank you,',
    'Infinity Sport',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 12px">Booking received</h1>
      <p>Hi ${escapeHtml(input.customerName)},</p>
      <p>We received your booking request at <strong>Infinity Sport</strong>. Our team will review it and contact you if anything else is needed.</p>
      <table style="border-collapse:collapse;margin-top:16px;width:100%;max-width:520px">
        ${details
          .map((detail) => {
            const [label, ...rest] = detail.split(': ');
            return `<tr><td style="border:1px solid #e5e7eb;padding:8px;font-weight:700;background:#f9fafb">${escapeHtml(label)}</td><td style="border:1px solid #e5e7eb;padding:8px">${escapeHtml(rest.join(': '))}</td></tr>`;
          })
          .join('')}
      </table>
      <p style="margin-top:18px">Thank you,<br/>Infinity Sport</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendBookingReceivedEmail(input: BookingEmailInput) {
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.BOOKING_EMAIL_FROM);
  const replyTo = clean(process.env.BOOKING_EMAIL_REPLY_TO || process.env.NEXT_PUBLIC_COMPANY_EMAIL);

  if (!apiKey || !from) {
    console.warn('[booking-email] skipped: RESEND_API_KEY and BOOKING_EMAIL_FROM are required');
    return { sent: false, skipped: true };
  }

  const message = buildBookingEmail(input);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: replyTo || undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Email provider rejected booking email (${response.status}): ${body}`);
  }

  return { sent: true, skipped: false };
}
