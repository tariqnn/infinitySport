import { prisma } from "./db";
import { buildRegistrationMembershipSummaries } from "./registrationMembership";
import {
  buildTrackerChildKey,
  type TrackerReceiptSyncInput,
} from "./trackerAccountSync";

function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export async function loadTrackerReceiptSyncInputsForContact(input: {
  customerEmail?: string | null;
  customerPhone?: string | null;
}): Promise<TrackerReceiptSyncInput[]> {
  const customerEmail = normalizeEmail(input.customerEmail);
  const customerPhone = normalizePhone(input.customerPhone);

  const registrationOr: Array<Record<string, unknown>> = [];
  if (customerEmail) {
    registrationOr.push({
      customerEmail: { equals: customerEmail, mode: "insensitive" },
    });
  }
  if (customerPhone) {
    registrationOr.push({ customerPhone });
  }

  if (registrationOr.length === 0) return [];

  const registrations = await prisma.packageRegistration.findMany({
    where: registrationOr.length === 1 ? registrationOr[0] : { OR: registrationOr },
    include: {
      receipts: {
        where: {
          status: "ACTIVE",
          voidedAt: null,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (registrations.length === 0) return [];

  const summaries = await buildRegistrationMembershipSummaries(prisma, registrations);
  const summaryByRegistrationId = new Map(
    summaries.map((summary) => [summary.id, summary]),
  );

  const receiptRows = await prisma.receipt.findMany({
    where: {
      registrationId: {
        in: registrations.map((registration) => registration.id),
      },
    },
    include: {
      registration: {
        select: {
          id: true,
          customerName: true,
          customerAge: true,
          customerPhone: true,
          customerEmail: true,
          packageName: true,
          planLabel: true,
          nextPaymentDate: true,
        },
      },
    },
    orderBy: [{ dateTimeIssued: "desc" }, { createdAt: "desc" }],
  });

  return receiptRows.map((receipt) => {
    const registration = receipt.registration;
    const summary = summaryByRegistrationId.get(receipt.registrationId);

    return {
      id: receipt.id,
      receiptId: receipt.receiptId,
      registrationId: receipt.registrationId,
      childKey: registration
        ? buildTrackerChildKey(registration.customerName, registration.customerAge ?? null)
        : null,
      studentName: registration?.customerName ?? receipt.personName,
      studentAge: registration?.customerAge ?? null,
      packageName: receipt.packageName || registration?.packageName || null,
      personName: receipt.personName,
      personPhone: receipt.personPhone,
      dateTimeIssued: receipt.dateTimeIssued,
      paymentPeriodKey: receipt.paymentPeriodKey ?? null,
      amountPaid: receipt.amountPaid,
      paymentMethod: receipt.paymentMethod,
      status: receipt.status,
      voidedAt: receipt.voidedAt,
      voidReason: receipt.voidReason,
      detailPath: `/api/portal/me/receipts/${receipt.id}`,
      pdfPath: `/api/portal/me/receipts/${receipt.id}/pdf`,
      planLabel: summary?.planLabel ?? registration?.planLabel ?? registration?.packageName ?? null,
      nextPaymentDate: summary?.nextPaymentDate ?? registration?.nextPaymentDate ?? null,
      paymentStatus: summary?.paymentStatus ?? null,
      finalPriceJod: summary?.finalPriceJod ?? null,
      collectedJod: summary?.collectedJod ?? null,
      remainingJod: summary?.remainingJod ?? null,
      registrationStatus: summary?.status ?? null,
    };
  });
}
