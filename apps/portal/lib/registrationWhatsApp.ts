type RegistrationWhatsAppRecipient = {
  id: string;
  customerName: string;
  customerPhone: string;
  packageName: string;
};

export type RegistrationWhatsAppFailure = {
  registrationId: string;
  customerName: string;
  customerPhone: string;
  message: string;
};

export type RegistrationWhatsAppBroadcastResult = {
  requestedRegistrations: number;
  uniqueRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
  invalidPhoneCount: number;
  duplicatePhoneCount: number;
  failures: RegistrationWhatsAppFailure[];
};

const MAX_WHATSAPP_BODY_LENGTH = 1600;
const MAX_BROADCAST_RECIPIENTS = 500;

function normalizeCountryCode(value: string | undefined) {
  const digits = String(value || "+962").replace(/\D/g, "");
  return digits || "962";
}

/**
 * Convert the phone formats commonly stored by the portal into E.164.
 * Jordan is the default, and can be changed with WHATSAPP_DEFAULT_COUNTRY_CODE.
 */
export function normalizeWhatsAppPhone(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const defaultCountryCode = normalizeCountryCode(
    process.env.WHATSAPP_DEFAULT_COUNTRY_CODE,
  );
  let digits = raw.replace(/\D/g, "");
  const hasInternationalPrefix =
    raw.startsWith("+") || digits.startsWith("00");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (hasInternationalPrefix) {
    // The digits are already in international format.
  } else if (digits.startsWith(defaultCountryCode)) {
    // The country code is already present without a leading plus.
  } else if (digits.startsWith("0")) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  } else {
    digits = `${defaultCountryCode}${digits}`;
  }

  const normalized = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function getTwilioConfiguration() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const configuredFrom = String(process.env.TWILIO_WHATSAPP_FROM || "").trim();
  const from = configuredFrom.replace(/^whatsapp:/i, "");

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "WhatsApp Business messaging is not configured. Ask the server administrator to finish the sender setup.",
    );
  }

  return { accountSid, authToken, from };
}

async function readTwilioError(response: Response) {
  const fallback = `The WhatsApp messaging provider rejected the message (${response.status}).`;
  try {
    const payload = (await response.json()) as {
      message?: string;
      code?: number | string;
    };
    const detail = String(payload.message || "")
      .replace(/\bTwilio\b/gi, "WhatsApp provider")
      .trim();
    const code = payload.code ? ` [${payload.code}]` : "";
    return detail ? `${detail}${code}` : fallback;
  } catch {
    return fallback;
  }
}

async function sendTwilioWhatsApp(
  to: string,
  body: string,
  configuration: ReturnType<typeof getTwilioConfiguration>,
) {
  const form = new URLSearchParams({
    From: `whatsapp:${configuration.from}`,
    To: `whatsapp:${to}`,
    Body: body,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(configuration.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${configuration.accountSid}:${configuration.authToken}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readTwilioError(response));
  }
}

export async function sendRegistrationWhatsAppBroadcast(
  registrations: RegistrationWhatsAppRecipient[],
  message: string,
): Promise<RegistrationWhatsAppBroadcastResult> {
  const body = String(message || "").trim();
  if (!body) throw new Error("Message is required.");
  if (body.length > MAX_WHATSAPP_BODY_LENGTH) {
    throw new Error(
      `Message must be ${MAX_WHATSAPP_BODY_LENGTH} characters or fewer.`,
    );
  }

  const configuration = getTwilioConfiguration();
  const recipients: Array<
    RegistrationWhatsAppRecipient & { normalizedPhone: string }
  > = [];
  const seenPhones = new Set<string>();
  let invalidPhoneCount = 0;
  let duplicatePhoneCount = 0;

  for (const registration of registrations) {
    const normalizedPhone = normalizeWhatsAppPhone(
      registration.customerPhone,
    );
    if (!normalizedPhone) {
      invalidPhoneCount += 1;
      continue;
    }
    if (seenPhones.has(normalizedPhone)) {
      duplicatePhoneCount += 1;
      continue;
    }
    seenPhones.add(normalizedPhone);
    recipients.push({ ...registration, normalizedPhone });
  }

  if (recipients.length > MAX_BROADCAST_RECIPIENTS) {
    throw new Error(
      `This broadcast has ${recipients.length} recipients. The maximum per send is ${MAX_BROADCAST_RECIPIENTS}.`,
    );
  }

  const failures: RegistrationWhatsAppFailure[] = [];
  let sent = 0;
  let cursor = 0;
  const requestedConcurrency = Number(
    process.env.WHATSAPP_SEND_CONCURRENCY || 4,
  );
  const concurrency = Math.max(
    1,
    Math.min(
      10,
      Number.isFinite(requestedConcurrency)
        ? Math.round(requestedConcurrency)
        : 4,
      recipients.length || 1,
    ),
  );

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < recipients.length) {
        const recipient = recipients[cursor];
        cursor += 1;
        try {
          await sendTwilioWhatsApp(
            recipient.normalizedPhone,
            body,
            configuration,
          );
          sent += 1;
        } catch (error) {
          failures.push({
            registrationId: recipient.id,
            customerName: recipient.customerName,
            customerPhone: recipient.customerPhone,
            message:
              error instanceof Error
                ? error.message
                : "The message could not be sent.",
          });
        }
      }
    }),
  );

  return {
    requestedRegistrations: registrations.length,
    uniqueRecipients: recipients.length,
    sent,
    failed: failures.length,
    skipped: invalidPhoneCount + duplicatePhoneCount,
    invalidPhoneCount,
    duplicatePhoneCount,
    failures: failures.slice(0, 25),
  };
}
