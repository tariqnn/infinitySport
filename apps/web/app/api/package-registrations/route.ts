import { NextResponse } from "next/server";
import { isValidPhoneNumber } from "../../../lib/phoneValidation";

async function getBasePriceJod(packageName: string): Promise<number> {
  const { prisma } = await import("../../../lib/db");

  const pkg = await prisma.package
    .findUnique({
      where: { name: packageName },
      select: { currentPriceJod: true },
    })
    .catch((error: unknown) => {
      console.warn("[package-registrations] package lookup skipped", error);
      return null;
    });
  if (pkg?.currentPriceJod != null) return Math.max(0, pkg.currentPriceJod);

  const pricing = await prisma.packagePricing
    .findUnique({
      where: { packageName },
      select: { basePriceJod: true },
    })
    .catch((error: unknown) => {
      console.warn("[package-registrations] pricing lookup skipped", error);
      return null;
    });
  return Math.max(0, pricing?.basePriceJod ?? 0);
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

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
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
    const basePriceJod = await getBasePriceJod(cleanPackage);

    const { prisma } = await import("../../../lib/db");
    const row = await prisma.packageRegistration.create({
      data: {
        packageName: cleanPackage,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail:
          typeof customerEmail === "string" && customerEmail.trim()
            ? customerEmail.trim()
            : null,
        customerAge:
          typeof customerAge === "number" && customerAge > 0
            ? customerAge
            : null,
        basePriceJod,
        discountType: "NONE",
        discountValue: null,
        discountReason: null,
        finalPriceJod: basePriceJod,
      },
      select: { id: true },
    });

    await ensureMemberAccount({
      customerEmail: typeof customerEmail === "string" ? customerEmail : null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
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
