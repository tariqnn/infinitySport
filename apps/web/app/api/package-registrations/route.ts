import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPgPool } from "../../../lib/pg";
import { isValidPhoneNumber } from "../../../lib/phoneValidation";
import { isDatabaseUnavailableError, noteDatabaseFailure } from "../../../lib/dbGuard";
import { syncRegistrationRecordToFirestore } from "../../../../portal/lib/registrationRealtimeSync";
import { getFirestore } from "../../../../portal/lib/firebase-admin";

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

async function resolveActiveCompanyId(): Promise<string> {
  const pool = getPgPool();
  const existing = await pool.query<{ id: string }>(
    'SELECT "id" FROM "Company" WHERE "status" = $1 ORDER BY "createdAt" DESC LIMIT 1',
    ["ACTIVE"],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const created = await pool.query<{ id: string }>(
    `
    INSERT INTO "Company" ("id", "name", "contactName", "contactEmail", "status", "createdAt", "updatedAt")
    VALUES ($1, 'Infinity Sport', 'Infinity Sport', 'infinitysportsacademyjo@gmail.com', 'ACTIVE', NOW(), NOW())
    RETURNING "id"
    `,
    [randomUUID()],
  );
  return created.rows[0].id;
}

async function getPackageDefaults(packageName: string): Promise<PackageDefaults> {
  const pool = getPgPool();

  const packageResult = await pool
    .query<{ currentPriceJod: number | null; durationMonths: number | null }>(
      'SELECT "currentPriceJod", "durationMonths" FROM "Package" WHERE "name" = $1 LIMIT 1',
      [packageName],
    )
    .catch((error: unknown) => {
      noteDatabaseFailure("package-registrations.getBasePrice.package", error);
      console.warn("[package-registrations] package lookup skipped", error);
      return null;
    });
  const pkg = packageResult?.rows?.[0];

  const pricingResult = await pool
    .query<{ basePriceJod: number | null }>(
      'SELECT "basePriceJod" FROM "PackagePricing" WHERE "packageName" = $1 LIMIT 1',
      [packageName],
    )
    .catch((error: unknown) => {
      noteDatabaseFailure("package-registrations.getBasePrice.pricing", error);
      console.warn("[package-registrations] pricing lookup skipped", error);
      return null;
    });
  const pricing = pricingResult?.rows?.[0];
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
  const pool = getPgPool();

  try {
    const companyId = await resolveActiveCompanyId();
    await pool.query(
      `
      INSERT INTO "User" (
        "id",
        "companyId",
        "fullName",
        "email",
        "name",
        "phone",
        "password",
        "role",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'MEMBER', true, NOW(), NOW())
      ON CONFLICT ("email")
      DO UPDATE SET
        "isActive" = true,
        "name" = COALESCE("User"."name", EXCLUDED."name"),
        "phone" = COALESCE("User"."phone", EXCLUDED."phone"),
        "updatedAt" = NOW()
      `,
      [
        randomUUID(),
        companyId,
        params.customerName.trim() || email,
        email,
        params.customerName.trim() || null,
        params.customerPhone.trim() || null,
        randomBytes(24).toString("hex"),
      ],
    );
  } catch (error) {
    noteDatabaseFailure("package-registrations.ensureMember", error);
    // User creation must never block registration submission.
    console.warn("[package-registrations] member account sync skipped", error);
  }
}

async function syncLandingRegistrationToFirestore(input: {
  id: string;
  packageName: string;
  planLabel?: string | null;
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
        planLabel: input.planLabel || input.packageName,
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
      planLabel,
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
    const cleanPlanLabel =
      typeof planLabel === "string" && planLabel.trim()
        ? planLabel.trim().slice(0, 1000)
        : null;
    const pool = getPgPool();
    const { basePriceJod, durationMonths } = await getPackageDefaults(cleanPackage);
    const registrationId = randomUUID();
    const periodStartsAt = new Date();
    const periodEndsAt = new Date(periodStartsAt);
    periodEndsAt.setMonth(periodEndsAt.getMonth() + durationMonths);

    await pool.query(
      `
      INSERT INTO "PackageRegistration" (
        "id",
        "packageName",
        "customerName",
        "customerPhone",
        "customerEmail",
        "customerAge",
        "isPaid",
        "basePriceJod",
        "discountType",
        "discountValue",
        "discountReason",
        "finalPriceJod",
        "durationMonths",
        "planLabel",
        "periodStartsAt",
        "periodEndsAt",
        "nextPaymentDate",
        "sessionsBonus",
        "status",
        "isFrozen",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, false, $7, 'NONE', NULL, NULL, $8, $9, $10, $11, $12, $13, 0, 'ACTIVE', false, NOW(), NOW()
      )
      `,
      [
        registrationId,
        cleanPackage,
        customerName.trim(),
        customerPhone.trim(),
        cleanEmail,
        typeof customerAge === "number" && customerAge > 0 ? customerAge : null,
        basePriceJod,
        basePriceJod,
        durationMonths,
        cleanPlanLabel,
        periodStartsAt,
        periodEndsAt,
        periodEndsAt,
      ],
    );

    await ensureMemberAccount({
      customerEmail: cleanEmail,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });

    await syncLandingRegistrationToFirestore({
      id: registrationId,
      packageName: cleanPackage,
      planLabel: cleanPlanLabel,
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

    return NextResponse.json({ success: true, id: registrationId });
  } catch (error) {
    noteDatabaseFailure("package-registrations.POST", error);
    console.error("[package-registrations] error", error);
    const status = isDatabaseUnavailableError(error) ? 503 : 500;
    return NextResponse.json(
      { error: "Unable to save registration. Please try again or contact us." },
      { status },
    );
  }
}
