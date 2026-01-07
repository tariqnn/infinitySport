import { NextResponse } from 'next/server';

// Simple email sending function (you can replace this with a real email service)
async function sendBookingConfirmationEmail(data: {
  name: string;
  phone: string;
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

  // TODO: Replace with actual email sending service
  console.log('📧 Booking confirmation email:', emailContent);
  
  // Example with Resend (uncomment and configure):
  /*
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Infinity Sport <bookings@infinitysport.jo>',
        to: [data.email || emailContent.to],
        subject: `Booking Confirmation - ${data.courtName}`,
        html: `
          <h2>Your Court Booking is Confirmed!</h2>
          <p>Hi ${data.name},</p>
          <p>Your booking has been received:</p>
          <ul>
            <li><strong>Court:</strong> ${data.courtName}</li>
            <li><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${data.time}</li>
          </ul>
          <p>We'll contact you at ${data.phone} to confirm your booking.</p>
          <p>See you at Infinity Sport!</p>
        `,
      }),
    });
    if (!res.ok) throw new Error('Failed to send email');
  }
  */

  return emailContent;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courtId, courtName, date, time, name, phone } = body ?? {};

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

    // Send confirmation email
    try {
      await sendBookingConfirmationEmail({
        name,
        phone,
        courtName,
        date,
        time,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the booking if email fails, but log it
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



