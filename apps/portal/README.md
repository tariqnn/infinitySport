This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## WhatsApp registration broadcasts

The Registrations page can send one WhatsApp message to manually selected
players or every active player in a package. Configure these server-side
environment variables for the Portal app:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_DEFAULT_COUNTRY_CODE=+962
WHATSAPP_SEND_CONCURRENCY=4
```

`WHATSAPP_DEFAULT_COUNTRY_CODE` and `WHATSAPP_SEND_CONCURRENCY` are optional.
The sender removes duplicate phone numbers and reports invalid numbers or
delivery-request failures after each broadcast.

The example `+14155238886` is the shared testing sandbox and must not be used
for production. To send from the academy's own number, register that number as
an approved WhatsApp Business sender first, then replace
`TWILIO_WHATSAPP_FROM` with the approved number in E.164 format, for example:

```bash
TWILIO_WHATSAPP_FROM=whatsapp:+9627XXXXXXXX
```

The name players see is the WhatsApp Business display name approved for that
sender. It is configured in the sender's business profile, not in this
application. Player-facing Portal messages use provider-neutral wording.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
