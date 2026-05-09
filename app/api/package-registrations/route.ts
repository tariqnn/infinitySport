import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isValidPhoneNumber } from "../../../lib/phoneValidation";
import { syncRegistrationRecordToFirestore } from "../../../apps/portal/lib/registrationRealtimeSync";
import { getFirestore } from "../../../apps/portal/lib/firebase-admin";

function ensureDatabaseUrl(): boolean {
  const explicitCandidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.PRISMA_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
  ];
  const resolved = explicitCandidates.find(
    (value): value is string => typeof value === "string" && !!value.trim(),
  );
  if (resolved && !process.env.DATABASE_URL) process.env.DATABASE_URL = resolved;
  if (resolved) return true;

  const inferred = Object.entries(process.env).find(([key, value]) => {
    if (typeof value !== "string" || !value.trim()) return false;
    if (!/^postgres(ql)?:\/\//i.test(value.trim())) return false;
    return /(DATABASE|POSTGRES|PRISMA|NEON|DB|URL)/i.test(key);
  });
  if (inferred) {
    process.env.DATABASE_URL = (inferred[1] as string).trim();
    console.warn(
      `[package-registrations] DATABASE_URL inferred from env key: ${inferred[0]}`,
    );
    return true;
  }

  const envFileCandidates = [
    path.join(process.cwd(), "runtime-env.json"),
    path.join(process.cwd(), "hostinger-output", "runtime-env.json"),
    path.join(
      process.cwd(),
      ".builds",
      "source",
      "repository",
      "hostinger-output",
      "runtime-env.json",
    ),
  ];
  for (const envFile of envFileCandidates) {
    try {
      if (!fs.existsSync(envFile)) continue;
      const parsed = JSON.parse(fs.readFileSync(envFile, "utf8")) as {
        DATABASE_URL?: string;
      };
      if (typeof parsed.DATABASE_URL === "string" && parsed.DATABASE_URL.trim()) {
        process.env.DATABASE_URL = parsed.DATABASE_URL.trim();
        console.warn(
          `[package-registrations] DATABASE_URL loaded from file: ${envFile}`,
        );
        return true;
      }
    } catch (error) {
      console.warn(
        `[package-registrations] failed reading runtime env file: ${envFile}`,
        error,
      );
    }
  }

  return false;
}

type PackageDefaults = {
  basePriceJod: number;
  durationMonths: number;
};

async function getPackageDefaults(packageName: string): Promise<PackageDefaults> {
  const { prisma } = await import("../../../lib/db");

  const pkg = await prisma.package
    .findUnique({
      where: { name: packageName },
      select: { currentPriceJod: true, durationMonths: true },
    })
    .catch((error: unknown) => {
      console.warn("[package-registrations] package lookup skipped", error);
      return null;
    });

  const pricing = await prisma.packagePricing
    .findUnique({
      where: { packageName },
      select: { basePriceJod: true },
    })
    .catch((error: unknown) => {
      console.warn("[package-registrations] pricing lookup skipped", error);
      return null;
    });
  if (pkg) {
    return {
      basePriceJod:
        pkg.currentPriceJod != null
          ? Math.max(0, pkg.currentPriceJod)
          : Math.max(0, pricing?.basePriceJod ?? 0),
      durationMonths: Math.max(1, pkg.durationMonths ?? 1),
    };
  }
  return {
    basePriceJod: Math.max(0, pricing?.basePriceJod ?? 0),
    durationMonths: 1,
  };
}

async function ensureMemberAccount(params: {
  customerEmail?: string | null;
  customerName: string;
  customerPhone: string;
}) {
  const email = (params.customerEmail || "").trim().toLowerCase();
  if (!email) return;
  const { prisma } = await import("../../../lib/db");

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(existing.name
            ? {}
            : { name: params.customerName.trim() || null }),
          ...(existing.phone
            ? {}
            : { phone: params.customerPhone.trim() || null }),
        },
      });
      return;
    }

    await prisma.user
      .create({
        data: {
          email,
          name: params.customerName.trim() || null,
          phone: params.customerPhone.trim() || null,
          role: "MEMBER",
          isActive: true,
        },
      })
      .catch((error: unknown) => {
        // Ignore unique races to keep registration flow resilient.
        if (
          typeof error === "object" &&
          error &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          return;
        }
        throw error;
      });
  } catch (error) {
    // User creation must never block registration submission.
    console.warn("[package-registrations] member account sync skipped", error);
  }
}

async function syncLandingRegistrationToFirestore(input: {
  id: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAge: number | null;
  basePriceJod: number;
  finalPriceJod: number;
  durationMonths: number;
  periodStartsAt: Date;
  periodEndsAt: Date;
}) {
  try {
    const now = new Date();
    const firestore = getFirestore();
    await syncRegistrationRecordToFirestore({
      firestore,
      registration: {
        id: input.id,
        packageName: input.packageName,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        customerAge: input.customerAge,
        currentCycle: 1,
        sessionsLeft: null,
        planLabel: input.packageName,
        isPaid: false,
        basePriceJod: input.basePriceJod,
        discountType: "NONE",
        finalPriceJod: input.finalPriceJod,
        durationMonths: input.durationMonths,
        periodStartsAt: input.periodStartsAt,
        periodEndsAt: input.periodEndsAt,
        isFrozen: false,
        sessionsBonus: 0,
        collected: 0,
        status: "ACTIVE",
        source: "WEBSITE",
        createdAt: now,
        updatedAt: now,
        deleted: false,
      },
    });
  } catch (error) {
    console.warn("[package-registrations] firestore sync skipped", error);
  }
}

export async function POST(request: Request) {
  try {
    if (!ensureDatabaseUrl()) {
      const dbLikeKeys = Object.keys(process.env)
        .filter((key) => /(DATABASE|POSTGRES|PRISMA|NEON|DB|URL)/i.test(key))
        .sort();
      console.error(
        "[package-registrations] missing DATABASE_URL at runtime; available env keys:",
        dbLikeKeys,
      );
      return NextResponse.json(
        { error: "Registration is unavailable. Please try again later." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      packageName,
      customerName,
      customerPhone,
      customerEmail,
      customerAge,
    } = body ?? {};

    if (
      !packageName ||
      typeof packageName !== "string" ||
      !packageName.trim()
    ) {
      return NextResponse.json(
        { error: "Please select a package." },
        { status: 400 },
      );
    }
    if (
      !customerName ||
      typeof customerName !== "string" ||
      !customerName.trim()
    ) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (
      !customerPhone ||
      typeof customerPhone !== "string" ||
      !customerPhone.trim()
    ) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 },
      );
    }
    if (
      !customerEmail ||
      typeof customerEmail !== "string" ||
      !customerEmail.trim()
    ) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const phoneValidation = isValidPhoneNumber(customerPhone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        {
          error:
            phoneValidation.error ||
            "Invalid phone number. Please enter a valid phone number.",
        },
        { status: 400 },
      );
    }

    const cleanPackage = packageName.trim();
    const cleanEmail = customerEmail.trim();
    const { basePriceJod, durationMonths } = await getPackageDefaults(cleanPackage);

    const { prisma } = await import("../../../lib/db");
    const periodStartsAt = new Date();
    const periodEndsAt = new Date(periodStartsAt);
    periodEndsAt.setMonth(periodEndsAt.getMonth() + durationMonths);
    const row = await prisma.packageRegistration.create({
      data: {
        packageName: cleanPackage,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: cleanEmail,
        customerAge:
          typeof customerAge === "number" && customerAge > 0
            ? customerAge
            : null,
        basePriceJod,
        discountType: "NONE",
        discountValue: null,
        discountReason: null,
        finalPriceJod: basePriceJod,
        durationMonths,
        periodStartsAt,
        periodEndsAt,
        nextPaymentDate: periodEndsAt,
      },
      select: { id: true },
    });

    await ensureMemberAccount({
      customerEmail: cleanEmail,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });

    await syncLandingRegistrationToFirestore({
      id: row.id,
      packageName: cleanPackage,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: cleanEmail,
      customerAge:
        typeof customerAge === "number" && customerAge > 0 ? customerAge : null,
      basePriceJod,
      finalPriceJod: basePriceJod,
      durationMonths,
      periodStartsAt,
      periodEndsAt,
    });

    return NextResponse.json({ success: true, id: row.id });
  } catch (error) {
    console.error("[package-registrations] error", error);
    return NextResponse.json(
      { error: "Unable to save registration. Please try again or contact us." },
      { status: 500 },
    );
  }
}
