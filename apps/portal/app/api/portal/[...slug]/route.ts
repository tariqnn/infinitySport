import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import crypto from "crypto";

const ACTIVE_RECEIPT_WHERE = {
  status: "ACTIVE" as const,
  voidedAt: null,
};

type Params = { slug: string[] };
type MaybePromise<T> = T | Promise<T>;

type RegistrationInput = {
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAge?: number | null;
  basePriceJod?: number;
  discountType?: string;
  discountValue?: number | null;
  discountReason?: string | null;
  periodStartsAt?: string | null;
  createdBy?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

async function resolveRouteParams(
  params: MaybePromise<Params>,
): Promise<Params> {
  return await Promise.resolve(params);
}

function clampNonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function extractConnectId(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  if (typeof record[key] === "string" && record[key]) {
    return record[key] as string;
  }

  const nested = record[key] as { connect?: { id?: string } } | undefined;
  if (nested?.connect?.id) return nested.connect.id;

  return null;
}

function computeFinalPriceJod(
  basePriceJod: number,
  discountType: string,
  discountValue: number | null | undefined,
) {
  const base = clampNonNegative(basePriceJod);
  if (!discountType || discountType === "NONE" || discountValue == null)
    return base;
  if (discountType === "PERCENT")
    return Math.max(0, base - Math.round((base * Number(discountValue)) / 100));
  if (discountType === "AMOUNT")
    return Math.max(0, base - Number(discountValue));
  return base;
}

function billingPeriodFromDate(date: Date): {
  billingPeriodKey: string;
  priceLockedUntil: Date;
} {
  const y = date.getFullYear();
  const m = date.getMonth();
  const billingPeriodKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const priceLockedUntil = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { billingPeriodKey, priceLockedUntil };
}

function hasUnknownArgument(error: unknown, argName: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Unknown argument \`${argName}\``);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected server error";
  }
}

function withoutPeriodStartsAt<T extends { periodStartsAt?: unknown }>(
  data: T,
): Omit<T, "periodStartsAt"> {
  const next = { ...data } as T;
  delete next.periodStartsAt;
  return next;
}

const PASSWORD_SCHEME = "scrypt-v1";
const MEMBER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type MemberTokenPayload = {
  uid: string;
  email: string;
  exp: number;
};

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePhoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function phoneLooksSame(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.endsWith(right) || right.endsWith(left);
}

function sanitizeMemberUser(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };
}

function validateNewPassword(password: string): string | null {
  const p = password.trim();
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    return "Password must include letters and numbers.";
  }
  return null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_SCHEME}$${salt}$${derived}`;
}

function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;
  const [scheme, salt, expectedHex] = storedHash.split("$");
  if (scheme !== PASSWORD_SCHEME || !salt || !expectedHex) return false;
  try {
    const derived = crypto
      .scryptSync(password, salt, expectedHex.length / 2)
      .toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(derived, "hex"),
      Buffer.from(expectedHex, "hex"),
    );
  } catch {
    return false;
  }
}

function getMemberAuthSecret(): string {
  return (
    process.env.MEMBER_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "infinity-member-dev-secret-change-me"
  );
}

function signMemberToken(payload: MemberTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getMemberAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyMemberToken(token: string): MemberTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = crypto
    .createHmac("sha256", getMemberAuthSecret())
    .update(encoded)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as MemberTokenPayload;
    if (!parsed?.uid || !parsed?.email || !parsed?.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function createPackageRegistrationCompat(
  delegate: { create: (args: any) => Promise<any> },
  args: { data: Record<string, unknown>; include?: Record<string, unknown> },
) {
  try {
    return await delegate.create(args as any);
  } catch (error) {
    if (
      hasUnknownArgument(error, "periodStartsAt") &&
      "periodStartsAt" in args.data
    ) {
      return delegate.create({
        ...args,
        data: withoutPeriodStartsAt(args.data),
      } as any);
    }
    throw error;
  }
}

async function updatePackageRegistrationCompat(args: {
  where: { id: string };
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
}) {
  try {
    return await prisma.packageRegistration.update(args as any);
  } catch (error) {
    if (
      hasUnknownArgument(error, "periodStartsAt") &&
      "periodStartsAt" in args.data
    ) {
      return prisma.packageRegistration.update({
        ...args,
        data: withoutPeriodStartsAt(args.data),
      } as any);
    }
    throw error;
  }
}

async function getBasePriceJod(packageName: string): Promise<number> {
  const pkg = await prisma.package
    .findUnique({ where: { name: packageName } })
    .catch(() => null);
  if (pkg?.currentPriceJod != null)
    return clampNonNegative(pkg.currentPriceJod);

  const pricing = await prisma.packagePricing
    .findUnique({ where: { packageName } })
    .catch(() => null);
  return clampNonNegative(pricing?.basePriceJod ?? 0);
}

function mapRegistrationRow(row: any) {
  const finalPriceJod = Number(row.finalPriceJod) || 0;
  const collected = (row.receipts || []).reduce(
    (sum: number, rec: any) => sum + (rec.amountPaid || 0),
    0,
  );
  return {
    id: row.id,
    packageName: row.packageName,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail ?? null,
    customerAge: row.customerAge ?? null,
    isPaid: Boolean(row.isPaid) && finalPriceJod > 0,
    basePriceJod: Number(row.basePriceJod) || 0,
    discountType: row.discountType ?? "NONE",
    discountValue: row.discountValue ?? null,
    discountReason: row.discountReason ?? null,
    finalPriceJod,
    collected,
    periodStartsAt: row.periodStartsAt ?? null,
    periodEndsAt: row.periodEndsAt ?? null,
    isFrozen: row.isFrozen ?? false,
    frozenAt: row.frozenAt ?? null,
    sessionsBonus: row.sessionsBonus ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type MemberRegistrationSummary = {
  id: string;
  studentName: string;
  packageName: string;
  customerAge: number | null;
  isPaid: boolean;
  finalPriceJod: number;
  collectedJod: number;
  status: string;
  daysLeft: number;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  sessionsBonus: number;
  sessionsRemaining: number | null;
  createdAt: string;
  updatedAt: string;
};

async function listMemberRegistrationsByEmail(
  email: string,
): Promise<MemberRegistrationSummary[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const rows = await prisma.packageRegistration.findMany({
    where: { customerEmail: { equals: normalized, mode: "insensitive" } },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    orderBy: { createdAt: "desc" },
  });

  if (rows.length === 0) return [];

  const packageNames = Array.from(
    new Set(rows.map((row) => row.packageName).filter(Boolean)),
  );
  const [packages, classSessionCounts] = await Promise.all([
    prisma.package
      .findMany({
        where: { name: { in: packageNames } },
        select: { name: true, sessionsCount: true, trackingType: true },
      })
      .catch(
        () =>
          [] as Array<{
            name: string;
            sessionsCount: number;
            trackingType: string;
          }>,
      ),
    prisma.classSession
      .groupBy({
        by: ["packageName"],
        where: {
          packageName: { in: packageNames },
          status: "HELD",
        },
        _count: { _all: true },
      })
      .catch(
        () => [] as Array<{ packageName: string; _count: { _all: number } }>,
      ),
  ]);

  const packageMeta = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const consumedByPackage = new Map(
    classSessionCounts.map((row) => [
      row.packageName,
      Number(row._count?._all || 0),
    ]),
  );

  const now = Date.now();

  return rows.map((row) => {
    const collectedJod = (row.receipts || []).reduce(
      (sum, rec) => sum + Number(rec.amountPaid || 0),
      0,
    );
    const finalPriceJod = Number(row.finalPriceJod) || 0;
    const endsAt = row.periodEndsAt
      ? new Date(row.periodEndsAt).getTime()
      : null;
    const daysLeft =
      endsAt == null
        ? 0
        : Math.max(0, Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000)));

    let status = String(row.status || "ACTIVE");
    if (status === "ACTIVE") {
      if (row.isFrozen) status = "FROZEN";
      else if (daysLeft <= 0) status = "EXPIRED";
      else if (daysLeft <= 7) status = "EXPIRING_SOON";
    }

    const pkg = packageMeta.get(row.packageName);
    const trackingType = String(pkg?.trackingType || "");
    const isSessionTracked =
      trackingType === "SESSIONS" || trackingType === "BOTH";
    const sessionsBase = Number(pkg?.sessionsCount || 0);
    const sessionsBonus = Number(row.sessionsBonus || 0);
    const consumed = consumedByPackage.get(row.packageName) || 0;
    const sessionsRemaining = isSessionTracked
      ? Math.max(0, sessionsBase + sessionsBonus - consumed)
      : null;

    return {
      id: row.id,
      studentName: row.customerName,
      packageName: row.packageName,
      customerAge: row.customerAge ?? null,
      isPaid: Boolean(row.isPaid) && finalPriceJod > 0,
      finalPriceJod,
      collectedJod,
      status,
      daysLeft,
      periodStartsAt: row.periodStartsAt
        ? new Date(row.periodStartsAt).toISOString()
        : null,
      periodEndsAt: row.periodEndsAt
        ? new Date(row.periodEndsAt).toISOString()
        : null,
      sessionsBonus,
      sessionsRemaining,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  });
}

async function findOrCreateUserFromRegistration(reg: {
  customerEmail?: string | null;
  customerName: string;
  customerPhone: string;
}): Promise<{ id: string } | null> {
  const email = (reg.customerEmail ?? "").trim().toLowerCase();
  if (!email) return null;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(existing.name ? {} : { name: reg.customerName.trim() || null }),
          ...(existing.phone
            ? {}
            : { phone: reg.customerPhone.trim() || null }),
        },
      });
      return { id: existing.id };
    }

    try {
      const created = await prisma.user.create({
        data: {
          email,
          name: reg.customerName.trim() || null,
          phone: reg.customerPhone.trim() || null,
          role: "MEMBER",
          isActive: true,
        },
        select: { id: true },
      });

      return created;
    } catch (error: any) {
      // Race-safe fallback: if another request created the same email first, reuse it.
      if (error?.code === "P2002") {
        const again = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (again) return again;
      }
      throw error;
    }
  } catch (error) {
    // User-linking must never block payment receipt creation.
    console.warn("[portal-db-api] user linking skipped", error);
    return null;
  }
}

async function getActiveMemberByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });
}

async function ensureMemberUserByRegistrationEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  let user = await getActiveMemberByEmail(normalized);
  if (user) return user;

  const reg = await prisma.packageRegistration.findFirst({
    where: { customerEmail: { equals: normalized, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      customerEmail: true,
      customerName: true,
      customerPhone: true,
    },
  });

  if (!reg) return null;

  await findOrCreateUserFromRegistration(reg);
  user = await getActiveMemberByEmail(normalized);
  return user;
}

async function resolveMemberUserFromRequest(request: NextRequest): Promise<
  | {
      user: {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        role: string;
        isActive: boolean;
        passwordHash: string | null;
      };
    }
  | { error: NextResponse }
> {
  const token = getBearerToken(request);
  if (token) {
    const payload = verifyMemberToken(token);
    if (!payload) return { error: jsonError("Invalid or expired token", 401) };

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });
    if (!user || !user.isActive)
      return { error: jsonError("Member account not found", 404) };
    if (normalizeEmail(user.email) !== normalizeEmail(payload.email)) {
      return { error: jsonError("Invalid token subject", 401) };
    }
    return { user };
  }

  const memberEmail = normalizeEmail(request.headers.get("x-member-email"));
  if (!memberEmail) return { error: jsonError("Missing member identity", 401) };

  const user = await ensureMemberUserByRegistrationEmail(memberEmail);
  if (!user || !user.isActive)
    return { error: jsonError("Member account not found", 404) };
  return { user };
}

async function buildMemberAuthPayload(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
}) {
  const registrations = await listMemberRegistrationsByEmail(user.email);
  return {
    token: signMemberToken({
      uid: user.id,
      email: user.email,
      exp: Date.now() + MEMBER_TOKEN_TTL_MS,
    }),
    user: sanitizeMemberUser(user),
    registrations,
  };
}

async function memberSignIn(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) return jsonError("Email and password are required");

  const user = await ensureMemberUserByRegistrationEmail(email);
  if (!user || !user.isActive)
    return jsonError("Invalid email or password", 401);
  if (!verifyPassword(password, user.passwordHash)) {
    if (!user.passwordHash) {
      return jsonError(
        "Password is not set for this account. Complete first-time setup.",
        428,
      );
    }
    return jsonError("Invalid email or password", 401);
  }

  return NextResponse.json(await buildMemberAuthPayload(user));
}

async function memberSetupPassword(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    phone?: string;
    newPassword?: string;
  };

  const email = normalizeEmail(body.email);
  const phone = String(body.phone || "").trim();
  const newPassword = String(body.newPassword || "");

  if (!email || !phone || !newPassword) {
    return jsonError("Email, phone, and newPassword are required");
  }
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return jsonError(passwordError);

  const user = await ensureMemberUserByRegistrationEmail(email);
  if (!user || !user.isActive) return jsonError("Account not found", 404);

  let phoneVerified = phoneLooksSame(phone, user.phone);
  if (!phoneVerified) {
    const matchingRegistration = await prisma.packageRegistration.findFirst({
      where: {
        customerEmail: { equals: email, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      select: { customerPhone: true },
    });
    phoneVerified = phoneLooksSame(phone, matchingRegistration?.customerPhone);
  }

  if (!phoneVerified) return jsonError("Phone verification failed", 403);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      isActive: true,
      ...(user.phone ? {} : { phone }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json(await buildMemberAuthPayload(updated));
}

async function memberChangePassword(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return jsonError("Authentication token is required", 401);

  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  if (!user.passwordHash) {
    return jsonError(
      "Password is not set for this account. Use first-time setup.",
      428,
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!currentPassword || !newPassword) {
    return jsonError("currentPassword and newPassword are required");
  }

  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return jsonError(passwordError);
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return jsonError("Current password is incorrect", 403);
  }
  if (currentPassword === newPassword) {
    return jsonError("New password must be different from current password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return NextResponse.json({ success: true });
}

async function getMemberMe(request: NextRequest) {
  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  const registrations = await listMemberRegistrationsByEmail(user.email);
  const active = registrations.filter(
    (r) => r.status === "ACTIVE" || r.status === "EXPIRING_SOON",
  ).length;
  const expiringSoon = registrations.filter(
    (r) => r.status === "EXPIRING_SOON",
  ).length;
  const expired = registrations.filter((r) => r.status === "EXPIRED").length;

  return NextResponse.json({
    ...sanitizeMemberUser(user),
    registrations,
    stats: {
      totalRegistrations: registrations.length,
      active,
      expiringSoon,
      expired,
    },
  });
}

async function getMemberInvoices(request: NextRequest) {
  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  const rows = await prisma.receipt.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          registration: {
            customerEmail: { equals: user.email, mode: "insensitive" },
          },
        },
      ],
    },
    orderBy: { dateTimeIssued: "desc" },
    select: {
      id: true,
      receiptId: true,
      dateTimeIssued: true,
      amountPaid: true,
      status: true,
      voidedAt: true,
      registrationId: true,
      packageName: true,
      personName: true,
      paymentMethod: true,
    },
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.receiptId,
      date: row.dateTimeIssued,
      amount: row.amountPaid,
      currency: "JOD",
      status: row.status === "VOIDED" || row.voidedAt ? "Refunded" : "Paid",
      registrationId: row.registrationId,
      packageName: row.packageName,
      studentName: row.personName,
      paymentMethod: row.paymentMethod,
    })),
  );
}

async function loadMemberReceiptForRequest(
  receiptId: string,
  request: NextRequest,
): Promise<
  | {
      row: Awaited<ReturnType<typeof prisma.receipt.findFirst>>;
      userEmail: string;
    }
  | { error: NextResponse }
> {
  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  const row = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      OR: [
        { userId: user.id },
        {
          registration: {
            customerEmail: { equals: user.email, mode: "insensitive" },
          },
        },
      ],
    },
    include: {
      registration: {
        include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
      },
    },
  });

  if (!row) return { error: jsonError("Receipt not found", 404) };

  return { row, userEmail: user.email };
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSimpleReceiptPdf(lines: string[]): Buffer {
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["0 -18 Td", `(${escapePdfText(line)}) Tj`],
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function getMemberReceipt(receiptId: string, request: NextRequest) {
  const loaded = await loadMemberReceiptForRequest(receiptId, request);
  if ("error" in loaded) return loaded.error;

  const { row } = loaded;

  const collected = (row.registration?.receipts || []).reduce(
    (sum, rec) => sum + Number(rec.amountPaid || 0),
    0,
  );
  return NextResponse.json({
    ...row,
    registration: row.registration
      ? {
          ...row.registration,
          collected,
        }
      : null,
  });
}

async function getMemberReceiptPdf(receiptId: string, request: NextRequest) {
  const loaded = await loadMemberReceiptForRequest(receiptId, request);
  if ("error" in loaded) return loaded.error;

  const { row, userEmail } = loaded;
  const lines = [
    `Infinity Sports Receipt - ${row.receiptId}`,
    `Date: ${new Date(row.dateTimeIssued).toLocaleString("en-GB")}`,
    `Member Email: ${userEmail}`,
    `Student: ${row.personName}`,
    `Phone: ${row.personPhone}`,
    `Package: ${row.packageName}`,
    `Amount: ${row.amountPaid} JOD`,
    `Payment Method: ${row.paymentMethod}`,
    `Status: ${row.status === "VOIDED" || row.voidedAt ? "Refunded" : "Paid"}`,
  ];

  const pdf = buildSimpleReceiptPdf(lines);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.receiptId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

async function generateReceiptId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;
  const latest = await prisma.receipt.findFirst({
    where: { receiptId: { startsWith: prefix } },
    select: { receiptId: true },
    orderBy: { receiptId: "desc" },
  });

  const nextNumber = (() => {
    if (!latest?.receiptId) return 1;
    const match = latest.receiptId.match(/^RCP-\d{4}-(\d+)$/);
    if (!match) return 1;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed + 1 : 1;
  })();

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

async function createPackageRegistration(payload: RegistrationInput) {
  const packageName = (payload.packageName || "").trim();
  const customerName = (payload.customerName || "").trim();
  const customerPhone = (payload.customerPhone || "").trim();

  if (!packageName) throw new Error("Package is required");
  if (!customerName) throw new Error("Customer name is required");
  if (!customerPhone) throw new Error("Customer phone is required");

  const basePriceJod = clampNonNegative(
    payload.basePriceJod != null
      ? Number(payload.basePriceJod)
      : await getBasePriceJod(packageName),
  );

  const discountType = (payload.discountType || "NONE").toUpperCase();
  const discountValue =
    discountType === "NONE" ? null : Number(payload.discountValue ?? 0);
  if (discountType !== "NONE") {
    const invalid =
      discountValue == null ||
      (discountType === "PERCENT" &&
        (discountValue < 0 || discountValue > 100)) ||
      (discountType === "AMOUNT" && discountValue < 0);
    if (invalid) throw new Error("Invalid discount");
    if (!(payload.discountReason || "").trim()) {
      throw new Error("Discount reason is required when applying a discount");
    }
  }

  const finalPriceJod = computeFinalPriceJod(
    basePriceJod,
    discountType,
    discountValue,
  );
  const now = new Date();
  const periodStartsAt = payload.periodStartsAt
    ? new Date(payload.periodStartsAt)
    : null;
  const periodEndsAt = periodStartsAt
    ? new Date(periodStartsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { billingPeriodKey, priceLockedUntil } = billingPeriodFromDate(now);

  const createData: Record<string, unknown> = {
    packageName,
    customerName,
    customerPhone,
    customerEmail: (payload.customerEmail || "").trim() || null,
    customerAge: payload.customerAge ?? null,
    isPaid: false,
    basePriceJod,
    discountType,
    discountValue: discountType === "NONE" ? null : Number(discountValue),
    discountReason:
      discountType === "NONE"
        ? null
        : (payload.discountReason || "").trim() || null,
    discountAppliedBy:
      discountType === "NONE" ? null : (payload.createdBy ?? null),
    discountAppliedAt: discountType === "NONE" ? null : now,
    finalPriceJod,
    billingPeriodKey,
    priceLockedUntil,
    periodEndsAt,
  };
  if (periodStartsAt) createData.periodStartsAt = periodStartsAt;

  const row = await createPackageRegistrationCompat(
    prisma.packageRegistration,
    {
      data: createData,
      include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    },
  );

  await findOrCreateUserFromRegistration({
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  });

  return mapRegistrationRow(row);
}

async function listPackageRegistrations(request: NextRequest) {
  const packageName =
    request.nextUrl.searchParams.get("packageName") || undefined;
  const startDate = request.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = request.nextUrl.searchParams.get("endDate") || undefined;

  const where: any = {};
  if (packageName) where.packageName = packageName;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const rows = await prisma.packageRegistration.findMany({
    where,
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rows.map(mapRegistrationRow));
}

async function getRegistrationTotals(request: NextRequest) {
  const packageName =
    request.nextUrl.searchParams.get("packageName") || undefined;
  const startDate = request.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = request.nextUrl.searchParams.get("endDate") || undefined;

  const where: any = {};
  if (packageName) where.packageName = packageName;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const regs = await prisma.packageRegistration.findMany({
    where,
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });

  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let expectedTotal = 0;
  let collectedTotal = 0;
  let discountsTotal = 0;

  const byMethod: Record<string, number> = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    OTHER: 0,
  };
  const byPackage: Record<
    string,
    {
      registered: number;
      expected: number;
      collected: number;
      remaining: number;
    }
  > = {};

  for (const reg of regs) {
    const finalPrice = Number(reg.finalPriceJod) || 0;
    const basePrice = Number(reg.basePriceJod) || 0;
    const collected = (reg.receipts || []).reduce(
      (sum, rec) => sum + (rec.amountPaid || 0),
      0,
    );

    expectedTotal += finalPrice;
    collectedTotal += collected;
    discountsTotal += Math.max(0, basePrice - finalPrice);

    const regIsPaid = Boolean(reg.isPaid) && finalPrice > 0;
    if (regIsPaid) paidCount += 1;
    else if (collected > 0) partialCount += 1;
    else unpaidCount += 1;

    for (const rec of reg.receipts || []) {
      const method = (rec.paymentMethod || "CASH").toUpperCase();
      if (byMethod[method] != null) byMethod[method] += rec.amountPaid || 0;
    }

    if (!packageName) {
      const pkg = reg.packageName || "";
      if (!byPackage[pkg])
        byPackage[pkg] = {
          registered: 0,
          expected: 0,
          collected: 0,
          remaining: 0,
        };
      byPackage[pkg].registered += 1;
      byPackage[pkg].expected += finalPrice;
      byPackage[pkg].collected += collected;
      byPackage[pkg].remaining += Math.max(0, finalPrice - collected);
    }
  }

  return NextResponse.json({
    totalRegistered: regs.length,
    paidCount,
    partialCount,
    unpaidCount,
    expectedTotal,
    collectedTotal,
    remainingTotal: expectedTotal - collectedTotal,
    discountsTotal,
    byMethod,
    byPackage: packageName ? undefined : byPackage,
  });
}

async function getDashboardStats(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId") || undefined;
  const companyWhere = companyId ? { companyId } : {};

  const [
    totalMembers,
    activeCoaches,
    activeClasses,
    activeSubscriptions,
    pendingBookings,
    pendingInvoices,
    openTasks,
    lowInventory,
  ] = await Promise.all([
    prisma.member.count({ where: companyWhere }),
    prisma.coach.count({ where: { ...companyWhere, status: "ACTIVE" as any } }),
    prisma.class.count({
      where: { ...companyWhere, status: "SCHEDULED" as any },
    }),
    prisma.subscription.count({
      where: { ...companyWhere, status: "ACTIVE" as any },
    }),
    prisma.booking.count({
      where: { ...companyWhere, status: "PENDING" as any },
    }),
    prisma.invoice.count({
      where: {
        ...companyWhere,
        status: { in: ["DRAFT", "SENT", "OVERDUE"] as any[] },
      },
    }),
    prisma.staffTask.count({
      where: {
        ...companyWhere,
        status: { in: ["OPEN", "IN_PROGRESS"] as any[] },
      },
    }),
    prisma.inventoryItem.count({
      where: {
        ...companyWhere,
        status: { in: ["LOW", "OUT_OF_STOCK"] as any[] },
      },
    }),
  ]);

  return NextResponse.json({
    totalMembers,
    activeCoaches,
    activeClasses,
    activeSubscriptions,
    pendingBookings,
    pendingInvoices,
    openTasks,
    lowInventory,
  });
}

async function bulkCreatePackageRegistrations(request: NextRequest) {
  const body = (await request.json()) as {
    startDate?: string | null;
    registrations: RegistrationInput[];
  };

  if (!Array.isArray(body.registrations)) {
    return jsonError("registrations must be an array");
  }

  const results: Array<{
    success: boolean;
    id?: string;
    row?: number;
    error?: string;
  }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < body.registrations.length; i += 1) {
    const item = body.registrations[i];
    const pkg = (item.packageName || "").trim();
    const phone = (item.customerPhone || "").trim();
    const key = `${pkg}|${phone}`;

    if (!(item.customerName || "").trim() || !phone) {
      results.push({
        success: false,
        row: i + 1,
        error: "Name and phone required",
      });
      continue;
    }

    if (seen.has(key)) {
      results.push({
        success: false,
        row: i + 1,
        error: "Duplicate phone in this batch",
      });
      continue;
    }
    seen.add(key);

    const existing = await prisma.packageRegistration.findFirst({
      where: { packageName: pkg, customerPhone: phone },
      select: { id: true },
    });
    if (existing) {
      results.push({
        success: false,
        row: i + 1,
        error: "Duplicate registration (same package + phone)",
      });
      continue;
    }

    try {
      const created = await createPackageRegistration({
        ...item,
        periodStartsAt: item.periodStartsAt ?? body.startDate ?? null,
      });
      results.push({ success: true, id: created.id, row: i + 1 });
    } catch (error) {
      results.push({
        success: false,
        row: i + 1,
        error: error instanceof Error ? error.message : "Create failed",
      });
    }
  }

  return NextResponse.json({ results });
}

async function bulkCreateForPerson(request: NextRequest) {
  const body = (await request.json()) as {
    person: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      customerAge?: number | null;
    };
    periodStartsAt?: string | null;
    registrations: RegistrationInput[];
  };

  const customerName = (body.person?.customerName || "").trim();
  const customerPhone = (body.person?.customerPhone || "").trim();
  if (!customerName || !customerPhone)
    return jsonError("Person name and phone are required");
  if (!Array.isArray(body.registrations) || body.registrations.length === 0) {
    return jsonError("At least one package is required");
  }

  try {
    const packageNames = body.registrations
      .map((r) => (r.packageName || "").trim())
      .filter(Boolean);
    if (packageNames.length !== body.registrations.length)
      return jsonError("Every registration must have a package name");

    const existing = await prisma.packageRegistration.findMany({
      where: {
        customerPhone,
        packageName: { in: packageNames },
      },
      select: { packageName: true },
    });
    if (existing.length > 0) {
      return jsonError(
        `Person already has an active registration for: ${existing.map((row) => row.packageName).join(", ")}`,
        409,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const out: any[] = [];

      for (const entry of body.registrations) {
        const packageName = (entry.packageName || "").trim();
        const basePriceJod = clampNonNegative(
          entry.basePriceJod != null
            ? Number(entry.basePriceJod)
            : await getBasePriceJod(packageName),
        );
        const discountType = (entry.discountType || "NONE").toUpperCase();
        const discountValue =
          discountType === "NONE" ? null : Number(entry.discountValue ?? 0);
        const finalPriceJod = computeFinalPriceJod(
          basePriceJod,
          discountType,
          discountValue,
        );

        const now = new Date();
        const periodStartsAt = entry.periodStartsAt
          ? new Date(entry.periodStartsAt)
          : body.periodStartsAt
            ? new Date(body.periodStartsAt)
            : null;
        const periodEndsAt = periodStartsAt
          ? new Date(periodStartsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const { billingPeriodKey, priceLockedUntil } =
          billingPeriodFromDate(now);

        const createData: Record<string, unknown> = {
          packageName,
          customerName,
          customerPhone,
          customerEmail: (body.person.customerEmail || "").trim() || null,
          customerAge: body.person.customerAge ?? null,
          isPaid: false,
          basePriceJod,
          discountType,
          discountValue: discountType === "NONE" ? null : Number(discountValue),
          discountReason:
            discountType === "NONE"
              ? null
              : (entry.discountReason || "").trim() || null,
          discountAppliedBy: discountType === "NONE" ? null : null,
          discountAppliedAt: discountType === "NONE" ? null : now,
          finalPriceJod,
          billingPeriodKey,
          priceLockedUntil,
          periodEndsAt,
        };
        if (periodStartsAt) createData.periodStartsAt = periodStartsAt;

        const row = await createPackageRegistrationCompat(
          tx.packageRegistration,
          {
            data: createData,
            include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
          },
        );

        out.push(mapRegistrationRow(row));
      }

      return out;
    });

    await findOrCreateUserFromRegistration({
      customerEmail: body.person.customerEmail ?? null,
      customerName,
      customerPhone,
    });

    return NextResponse.json({
      created: created.length,
      registrations: created,
    });
  } catch (error: any) {
    const code = error?.code as string | undefined;
    if (code === "P2002") {
      return jsonError(
        "Duplicate registration detected. Please refresh and try again.",
        409,
      );
    }
    return jsonError(getErrorMessage(error), 500);
  }
}

async function updatePackageRegistration(id: string, request: NextRequest) {
  const body = (await request.json()) as {
    packageName?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string | null;
    customerAge?: number | null;
    isPaid?: boolean;
    isFrozen?: boolean;
    basePriceJod?: number;
    discountType?: string;
    discountValue?: number | null;
    discountReason?: string | null;
    createdBy?: string | null;
    periodStartsAt?: string | null;
    periodEndsAt?: string | null;
  };

  const existing = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!existing) return jsonError("Package registration not found", 404);

  const updateData: any = {};
  if (body.packageName !== undefined) {
    const packageName = String(body.packageName || "").trim();
    if (!packageName) return jsonError("Package is required");
    updateData.packageName = packageName;
  }
  if (body.customerName !== undefined) {
    const customerName = String(body.customerName || "").trim();
    if (!customerName) return jsonError("Customer name is required");
    updateData.customerName = customerName;
  }
  if (body.customerPhone !== undefined) {
    const customerPhone = String(body.customerPhone || "").trim();
    if (!customerPhone) return jsonError("Customer phone is required");
    updateData.customerPhone = customerPhone;
  }
  if (body.customerEmail !== undefined) {
    updateData.customerEmail = String(body.customerEmail || "").trim() || null;
  }
  if (body.customerAge !== undefined) {
    if (body.customerAge == null) {
      updateData.customerAge = null;
    } else {
      const parsedAge = Number(body.customerAge);
      if (!Number.isFinite(parsedAge) || parsedAge < 0) {
        return jsonError("Customer age must be a positive number");
      }
      updateData.customerAge = Math.round(parsedAge);
    }
  }
  if (body.isPaid !== undefined) updateData.isPaid = Boolean(body.isPaid);

  const nextPackageName = (updateData.packageName ??
    existing.packageName) as string;
  const nextCustomerPhone = (updateData.customerPhone ??
    existing.customerPhone) as string;
  if (
    nextPackageName !== existing.packageName ||
    nextCustomerPhone !== existing.customerPhone
  ) {
    const duplicate = await prisma.packageRegistration.findFirst({
      where: {
        id: { not: id },
        packageName: nextPackageName,
        customerPhone: nextCustomerPhone,
      },
      select: { id: true },
    });
    if (duplicate) {
      return jsonError("Duplicate registration (same package + phone)", 409);
    }
  }

  if (
    body.basePriceJod !== undefined ||
    body.discountType !== undefined ||
    body.discountValue !== undefined ||
    body.discountReason !== undefined
  ) {
    const basePriceJod = Math.round(
      clampNonNegative(Number(body.basePriceJod ?? existing.basePriceJod)),
    );
    const discountType = (
      body.discountType ??
      existing.discountType ??
      "NONE"
    ).toUpperCase();
    if (!["NONE", "PERCENT", "AMOUNT"].includes(discountType)) {
      return jsonError("Invalid discount type");
    }
    const discountValue =
      discountType === "NONE"
        ? null
        : Math.round(Number(body.discountValue ?? existing.discountValue ?? 0));
    if (
      discountType !== "NONE" &&
      (discountValue == null ||
        (discountType === "PERCENT" &&
          (discountValue < 0 || discountValue > 100)) ||
        (discountType === "AMOUNT" && discountValue < 0))
    ) {
      return jsonError("Invalid discount");
    }

    if (
      discountType !== "NONE" &&
      !(body.discountReason ?? existing.discountReason ?? "").trim()
    ) {
      return jsonError("Discount reason is required when applying a discount");
    }

    updateData.basePriceJod = basePriceJod;
    updateData.discountType = discountType;
    updateData.discountValue =
      discountType === "NONE" ? null : Number(discountValue);
    updateData.discountReason =
      discountType === "NONE"
        ? null
        : (body.discountReason ?? existing.discountReason ?? "").trim() || null;
    updateData.finalPriceJod = computeFinalPriceJod(
      basePriceJod,
      discountType,
      discountValue,
    );
    if (discountType !== "NONE") {
      updateData.discountAppliedBy = body.createdBy ?? null;
      updateData.discountAppliedAt = new Date();
    }
  }

  if (body.periodStartsAt !== undefined) {
    if (body.periodStartsAt) {
      const periodStartsAt = new Date(body.periodStartsAt);
      if (Number.isNaN(periodStartsAt.getTime())) {
        return jsonError("Invalid period start date");
      }
      updateData.periodStartsAt = periodStartsAt;
      if (body.periodEndsAt === undefined) {
        updateData.periodEndsAt = new Date(
          periodStartsAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
      }
    } else {
      updateData.periodStartsAt = null;
    }
  }
  if (body.periodEndsAt !== undefined) {
    if (body.periodEndsAt) {
      const periodEndsAt = new Date(body.periodEndsAt);
      if (Number.isNaN(periodEndsAt.getTime())) {
        return jsonError("Invalid period end date");
      }
      updateData.periodEndsAt = periodEndsAt;
    } else {
      updateData.periodEndsAt = null;
    }
  }

  if (body.isFrozen !== undefined) {
    updateData.isFrozen = Boolean(body.isFrozen);
    if (body.isFrozen) {
      updateData.frozenAt = new Date();
    } else {
      if (existing.frozenAt) {
        const now = new Date();
        const frozenMs = now.getTime() - existing.frozenAt.getTime();
        const currentEnd = existing.periodEndsAt
          ? new Date(existing.periodEndsAt)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        updateData.periodEndsAt = new Date(currentEnd.getTime() + frozenMs);
      }
      updateData.frozenAt = null;
    }
  }

  const row = await updatePackageRegistrationCompat({
    where: { id },
    data: updateData,
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });

  await findOrCreateUserFromRegistration({
    customerEmail: row.customerEmail ?? null,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  });

  return NextResponse.json(mapRegistrationRow(row));
}

async function reregisterPackage(id: string) {
  const existing = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!existing) return jsonError("Registration not found", 404);

  const now = new Date();
  const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { billingPeriodKey, priceLockedUntil } = billingPeriodFromDate(now);

  const row = await prisma.packageRegistration.create({
    data: {
      packageName: existing.packageName,
      customerName: existing.customerName,
      customerPhone: existing.customerPhone,
      customerEmail: existing.customerEmail,
      customerAge: existing.customerAge,
      isPaid: false,
      basePriceJod: existing.basePriceJod,
      discountType: existing.discountType,
      discountValue: existing.discountValue,
      discountReason: existing.discountReason,
      finalPriceJod: existing.finalPriceJod,
      billingPeriodKey,
      priceLockedUntil,
      periodEndsAt,
    },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });

  await findOrCreateUserFromRegistration({
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  });

  return NextResponse.json(mapRegistrationRow(row));
}

async function markRegistrationPaid(id: string, request: NextRequest) {
  const body = (await request.json()) as {
    amountPaid: number;
    paymentMethod: string;
    privateNote: string;
    createdBy?: string;
  };

  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);
  if (!(body.privateNote || "").trim())
    return jsonError("Private note is required");

  const method = (body.paymentMethod || "CASH").toUpperCase();
  if (!["CASH", "CARD", "TRANSFER", "OTHER"].includes(method))
    return jsonError("Invalid payment method");
  const amountPaid = Math.round(Number(body.amountPaid) || 0);
  if (amountPaid <= 0) return jsonError("Amount paid must be greater than 0");

  const user = await findOrCreateUserFromRegistration(registration);

  let receipt = null as any;
  for (let i = 0; i < 3; i += 1) {
    const receiptId = await generateReceiptId();
    try {
      receipt = await prisma.receipt.create({
        data: {
          receiptId,
          registrationId: id,
          personName: registration.customerName,
          personPhone: registration.customerPhone,
          packageName: registration.packageName,
          amountPaid,
          paymentMethod: method,
          privateNote: body.privateNote.trim(),
          createdBy: body.createdBy ?? null,
        },
      });
      break;
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
    }
  }

  if (!receipt) {
    return jsonError("Unable to generate receipt ID. Please retry.", 500);
  }

  if (user?.id) {
    try {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { userId: user.id },
      });
    } catch (error) {
      // Payment must succeed even if optional user-linking schema is not yet migrated.
      console.warn("[portal-db-api] receipt user linking skipped", error);
    }
  }

  const aggregate = await prisma.receipt.aggregate({
    where: { registrationId: id, ...ACTIVE_RECEIPT_WHERE },
    _sum: { amountPaid: true },
  });
  const totalCollected = aggregate._sum.amountPaid ?? 0;
  const targetPrice = Number(registration.finalPriceJod || 0);

  await prisma.packageRegistration.update({
    where: { id },
    data: { isPaid: targetPrice > 0 && totalCollected >= targetPrice },
  });

  return NextResponse.json(receipt);
}

async function markRegistrationUnpaid(id: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    voidReason?: string;
  };
  const voidReason =
    (body.voidReason || "").trim() || "Marked as unpaid by staff";

  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);

  const activeReceipts = await prisma.receipt.findMany({
    where: { registrationId: id, ...ACTIVE_RECEIPT_WHERE },
    select: { id: true },
  });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (activeReceipts.length > 0) {
      await tx.receipt.updateMany({
        where: { id: { in: activeReceipts.map((r) => r.id) } },
        data: {
          status: "VOIDED",
          voidedAt: now,
          voidReason,
        },
      });
    }

    await tx.packageRegistration.update({
      where: { id },
      data: { isPaid: false },
    });
  });

  return NextResponse.json({
    success: true,
    voidedCount: activeReceipts.length,
  });
}

async function listReceiptsForRegistration(id: string) {
  const receipts = await prisma.receipt.findMany({
    where: { registrationId: id, ...ACTIVE_RECEIPT_WHERE },
    orderBy: { dateTimeIssued: "desc" },
  });
  return NextResponse.json(receipts);
}

async function addSessionAdjustment(id: string, request: NextRequest) {
  const body = (await request.json()) as { reason: string; createdBy?: string };
  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);
  if (!(body.reason || "").trim()) return jsonError("Reason is required");

  await prisma.sessionAdjustment.create({
    data: {
      registrationId: id,
      change: 1,
      reason: body.reason.trim(),
      createdBy: body.createdBy ?? null,
    },
  });

  const sessionsBonus = (Number(registration.sessionsBonus) || 0) + 1;
  await prisma.packageRegistration.update({
    where: { id },
    data: { sessionsBonus },
  });

  return NextResponse.json({ success: true, sessionsBonus });
}

async function listSessionAdjustments(id: string) {
  const rows = await prisma.sessionAdjustment.findMany({
    where: { registrationId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

async function getReceipt(id: string) {
  let receipt: any = null;
  try {
    receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        registration: true,
        user: { select: { id: true, email: true, name: true, isActive: true } },
      },
    });
  } catch (error) {
    console.warn(
      "[portal-db-api] receipt user relation unavailable, retrying without user include",
      error,
    );
    receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { registration: true },
    });
  }
  if (!receipt) return jsonError("Receipt not found", 404);
  return NextResponse.json(receipt);
}

async function voidReceipt(id: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    voidReason?: string;
  };
  const reason = (body.voidReason || "").trim();
  if (!reason)
    return jsonError("voidReason is required when voiding a receipt");

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { registration: true },
  });
  if (!receipt) return jsonError("Receipt not found", 404);
  if (receipt.voidedAt || receipt.status === "VOIDED")
    return jsonError("Receipt is already voided");

  await prisma.receipt.update({
    where: { id },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason },
  });

  const aggregate = await prisma.receipt.aggregate({
    where: { registrationId: receipt.registrationId, ...ACTIVE_RECEIPT_WHERE },
    _sum: { amountPaid: true },
  });
  const totalCollected = aggregate._sum.amountPaid ?? 0;
  const targetPrice = Number(receipt.registration.finalPriceJod || 0);

  await prisma.packageRegistration.update({
    where: { id: receipt.registrationId },
    data: { isPaid: targetPrice > 0 && totalCollected >= targetPrice },
  });

  return NextResponse.json({ success: true });
}

async function dispatchGet(request: NextRequest, params: Params) {
  const [resource, id, action, extra] = params.slug;

  if (resource === "me" && !id) {
    return getMemberMe(request);
  }

  if (resource === "me" && id === "registrations" && !action) {
    const resolved = await resolveMemberUserFromRequest(request);
    if ("error" in resolved) return resolved.error;
    return NextResponse.json(
      await listMemberRegistrationsByEmail(resolved.user.email),
    );
  }

  if (resource === "me" && id === "invoices" && !action) {
    return getMemberInvoices(request);
  }

  if (resource === "me" && id === "receipts" && action && !extra) {
    return getMemberReceipt(action, request);
  }

  if (resource === "me" && id === "receipts" && action && extra === "pdf") {
    return getMemberReceiptPdf(action, request);
  }

  if (resource === "companies" && !id) {
    const rows = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "bookings" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    const where: any = {};
    if (companyId) where.companyId = companyId;

    if (startDate && endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      if (start && end) {
        where.startTime = { gte: start, lte: end };
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } },
        facility: { select: { id: true, name: true } },
        member: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(bookings);
  }

  if (resource === "bookings" && id) {
    const row = await prisma.booking.findUnique({
      where: { id },
      include: {
        company: true,
        program: true,
        facility: true,
        member: true,
        class: true,
        coach: true,
      },
    });
    if (!row) return jsonError("Booking not found", 404);
    return NextResponse.json(row);
  }

  if (resource === "members" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const rows = await prisma.member.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        subscriptions: true,
        bookings: true,
        enrollments: { include: { class: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "classes" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const coachId = request.nextUrl.searchParams.get("coachId") || undefined;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (coachId) where.coachId = coachId;

    const rows = await prisma.class.findMany({
      where,
      include: {
        coach: true,
        company: true,
        enrollments: {
          include: { member: true },
        },
      },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "coaches" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const rows = await prisma.coach.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        classes: true,
        bookings: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  // Landing coaches shared with Admin (/api/admin/coaches)
  if (resource === "landing-coaches" && !id) {
    const rows = await prisma.landingCoach.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(rows);
  }

  if (resource === "dashboard" && id === "stats") {
    return getDashboardStats(request);
  }

  if (resource === "package-pricing" && !id) {
    const rows = await prisma.packagePricing.findMany({
      orderBy: { packageName: "asc" },
    });
    return NextResponse.json(
      rows.map((row) => ({
        packageName: row.packageName,
        basePriceJod: row.basePriceJod ?? null,
      })),
    );
  }

  if (resource === "packages" && !id) {
    const rows = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        sportType: true,
        name: true,
        description: true,
        sessionsCount: true,
        trackingType: true,
        pricingType: true,
        currentPriceJod: true,
        isActive: true,
        sortOrder: true,
      },
    });
    return NextResponse.json(rows);
  }

  if (resource === "package-registrations" && id === "totals") {
    return getRegistrationTotals(request);
  }

  if (resource === "package-registrations" && !id) {
    return listPackageRegistrations(request);
  }

  if (resource === "package-registrations" && action === "receipts") {
    return listReceiptsForRegistration(id);
  }

  if (
    resource === "package-registrations" &&
    action === "session-adjustments"
  ) {
    return listSessionAdjustments(id);
  }

  if (resource === "receipts" && id && !action) {
    return getReceipt(id);
  }

  if (resource === "package-session-canceled" && !id) {
    const packageName =
      request.nextUrl.searchParams.get("packageName") || undefined;
    const startDate =
      request.nextUrl.searchParams.get("startDate") || undefined;
    const endDate = request.nextUrl.searchParams.get("endDate") || undefined;

    const where: any = {};
    if (packageName) where.packageName = packageName;
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.sessionDate.lte = end;
      }
    }

    const rows = await prisma.packageSessionCanceled.findMany({
      where,
      orderBy: { sessionDate: "desc" },
    });
    return NextResponse.json(rows);
  }

  return jsonError("Not found", 404);
}

async function dispatchPost(request: NextRequest, params: Params) {
  const [resource, id, action] = params.slug;

  if (resource === "member-auth" && id === "sign-in" && !action) {
    return memberSignIn(request);
  }

  if (resource === "member-auth" && id === "setup-password" && !action) {
    return memberSetupPassword(request);
  }

  if (resource === "member-auth" && id === "change-password" && !action) {
    return memberChangePassword(request);
  }

  if (resource === "companies" && !id) {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) return jsonError("Company name is required");

    const existing = await prisma.company.findFirst({ where: { name } });
    if (existing) return NextResponse.json(existing);

    const company = await prisma.company.create({
      data: {
        name,
        contactName: String(body.contactName || name).trim(),
        contactEmail:
          String(body.contactEmail || "").trim() ||
          "infinitysportsacademyjo@gmail.com",
        phone: (body.phone as string | null | undefined) ?? null,
        industry: (body.industry as string | null | undefined) ?? null,
        size: (body.size as string | null | undefined) ?? null,
        status: (typeof body.status === "string"
          ? body.status
          : "ACTIVE") as any,
      },
    });

    return NextResponse.json(company);
  }

  if (resource === "bookings" && !id) {
    const body = (await request.json()) as Record<string, unknown>;

    const companyId =
      extractConnectId(body, "company") || extractConnectId(body, "companyId");
    if (!companyId) return jsonError("companyId is required");

    const startTime = parseDate(String(body.startTime || ""));
    const endTime = parseDate(String(body.endTime || ""));
    if (!startTime || !endTime)
      return jsonError("Valid startTime and endTime are required");

    const data: any = {
      companyId,
      startTime,
      endTime,
      facilityArea: (body.facilityArea as string | undefined) || null,
      status: (typeof body.status === "string"
        ? body.status
        : "PENDING") as any,
      isPaid: Boolean(body.isPaid ?? false),
      customerName: (body.customerName as string | undefined) ?? null,
      customerPhone: (body.customerPhone as string | undefined) ?? null,
      customerEmail: (body.customerEmail as string | undefined) ?? null,
      notes: (body.notes as string | undefined) ?? null,
    };

    const classId =
      extractConnectId(body, "class") || extractConnectId(body, "classId");
    const coachId =
      extractConnectId(body, "coach") || extractConnectId(body, "coachId");
    const memberId =
      extractConnectId(body, "member") || extractConnectId(body, "memberId");

    if (classId) data.class = { connect: { id: classId } };
    if (coachId) data.coach = { connect: { id: coachId } };
    if (memberId) data.member = { connect: { id: memberId } };

    const row = await prisma.booking.create({
      data,
      include: {
        company: true,
        class: true,
        coach: true,
        member: true,
      },
    });

    return NextResponse.json(row);
  }

  if (resource === "package-registrations" && id === "bulk") {
    return bulkCreatePackageRegistrations(request);
  }

  if (resource === "package-registrations" && id === "bulk-for-person") {
    return bulkCreateForPerson(request);
  }

  if (resource === "package-registrations" && !id) {
    const body = (await request.json()) as RegistrationInput;
    try {
      const row = await createPackageRegistration(body);
      return NextResponse.json(row);
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Failed to create registration",
      );
    }
  }

  if (resource === "package-registrations" && action === "reregister") {
    return reregisterPackage(id);
  }

  if (resource === "package-registrations" && action === "mark-paid") {
    return markRegistrationPaid(id, request);
  }

  if (resource === "package-registrations" && action === "mark-unpaid") {
    return markRegistrationUnpaid(id, request);
  }

  if (resource === "package-registrations" && action === "session-adjustment") {
    return addSessionAdjustment(id, request);
  }

  if (resource === "package-session-canceled" && !id) {
    const body = (await request.json()) as {
      packageName: string;
      sessionDate: string;
      reason: string;
      reasonDetail?: string | null;
    };

    const validReasons = [
      "HOLIDAY",
      "BAD_WEATHER",
      "TEACHER_UNAVAILABLE",
      "OTHER",
    ];
    const reason = (body.reason || "OTHER").toUpperCase();
    if (!validReasons.includes(reason)) return jsonError("Invalid reason");

    const sessionDate = parseDate(body.sessionDate);
    if (!sessionDate) return jsonError("Invalid session date");

    const row = await prisma.packageSessionCanceled.create({
      data: {
        packageName: (body.packageName || "").trim(),
        sessionDate,
        reason,
        reasonDetail: (body.reasonDetail || "").trim() || null,
      },
    });

    return NextResponse.json(row);
  }

  return jsonError("Not found", 404);
}

async function dispatchPatch(request: NextRequest, params: Params) {
  const [resource, id, action] = params.slug;

  if (!id) return jsonError("Missing ID");

  if (resource === "bookings" && !action) {
    const body = (await request.json()) as Record<string, unknown>;
    const data: any = {};

    if (body.startTime !== undefined) {
      const d = parseDate(String(body.startTime));
      if (!d) return jsonError("Invalid startTime");
      data.startTime = d;
    }

    if (body.endTime !== undefined) {
      const d = parseDate(String(body.endTime));
      if (!d) return jsonError("Invalid endTime");
      data.endTime = d;
    }

    if (body.facilityArea !== undefined)
      data.facilityArea = (body.facilityArea as string | null) ?? null;
    if (body.status !== undefined) data.status = body.status as any;
    if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid);
    if (body.notes !== undefined)
      data.notes = (body.notes as string | null) ?? null;
    if (body.customerName !== undefined)
      data.customerName = (body.customerName as string | null) ?? null;
    if (body.customerPhone !== undefined)
      data.customerPhone = (body.customerPhone as string | null) ?? null;
    if (body.customerEmail !== undefined)
      data.customerEmail = (body.customerEmail as string | null) ?? null;

    const classId =
      extractConnectId(body, "class") || extractConnectId(body, "classId");
    const coachId =
      extractConnectId(body, "coach") || extractConnectId(body, "coachId");
    const memberId =
      extractConnectId(body, "member") || extractConnectId(body, "memberId");

    if (classId) data.class = { connect: { id: classId } };
    if (coachId) data.coach = { connect: { id: coachId } };
    if (memberId) data.member = { connect: { id: memberId } };

    try {
      const row = await prisma.booking.update({
        where: { id },
        data,
        include: {
          company: true,
          class: true,
          coach: true,
          member: true,
        },
      });
      return NextResponse.json(row);
    } catch (error: any) {
      if (error?.code === "P2025") return jsonError("Booking not found", 404);
      return jsonError("Failed to update booking", 500);
    }
  }

  if (resource === "package-registrations" && !action) {
    return updatePackageRegistration(id, request);
  }

  if (resource === "receipts" && action === "void") {
    return voidReceipt(id, request);
  }

  return jsonError("Not found", 404);
}

async function dispatchDelete(_request: NextRequest, params: Params) {
  const [resource, id] = params.slug;

  if (!id) return jsonError("Missing ID");

  if (resource === "bookings") {
    try {
      await prisma.booking.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error?.code === "P2025") return jsonError("Booking not found", 404);
      return jsonError("Failed to delete booking", 500);
    }
  }

  if (resource === "package-registrations") {
    try {
      await prisma.packageRegistration.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error?.code === "P2025")
        return jsonError("Registration not found", 404);
      return jsonError("Failed to delete registration", 500);
    }
  }

  return jsonError("Not found", 404);
}

export async function GET(
  request: NextRequest,
  context: { params: MaybePromise<Params> },
) {
  try {
    return await dispatchGet(request, await resolveRouteParams(context.params));
  } catch (error) {
    console.error("[portal-db-api][GET] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: MaybePromise<Params> },
) {
  try {
    return await dispatchPost(
      request,
      await resolveRouteParams(context.params),
    );
  } catch (error) {
    console.error("[portal-db-api][POST] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: MaybePromise<Params> },
) {
  try {
    return await dispatchPatch(
      request,
      await resolveRouteParams(context.params),
    );
  } catch (error) {
    console.error("[portal-db-api][PATCH] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: MaybePromise<Params> },
) {
  try {
    return await dispatchDelete(
      request,
      await resolveRouteParams(context.params),
    );
  } catch (error) {
    console.error("[portal-db-api][DELETE] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}
