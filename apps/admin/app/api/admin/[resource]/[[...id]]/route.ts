import { NextRequest, NextResponse } from 'next/server';
import {
  academyEventToAdminApi,
  createAcademyEvent,
  deleteAcademyEvent,
  getAcademyEvent,
  listAcademyEvents,
  updateAcademyEvent,
} from '../../../../../lib/academyEventsFirestore';
import { prisma } from '../../../../../lib/db';

type RouteParams = {
  resource: string;
  id?: string[];
};

type RouteContext = {
  params: Promise<RouteParams>;
};

type JsonBody = Record<string, unknown>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  return await context.params;
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toStringOrEmpty(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function toInteger(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function hasOwn(obj: JsonBody, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getId(params: RouteParams): string | null {
  const id = params.id?.[0];
  return id && id.length > 0 ? id : null;
}

async function readJson(request: NextRequest): Promise<JsonBody> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
    return body as JsonBody;
  } catch {
    return {};
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function handleGet(resource: string, id: string | null) {
  if (resource === 'hero') {
    const hero = await prisma.heroSection.findFirst({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(hero);
  }

  if (resource === 'programs') {
    if (id) {
      const row = await prisma.program.findUnique({ where: { id } });
      if (!row) return jsonError('Program not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.program.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json(rows);
  }

  if (resource === 'coaches') {
    if (id) {
      const row = await prisma.landingCoach.findUnique({ where: { id } });
      if (!row) return jsonError('Coach not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.landingCoach.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json(rows);
  }

  if (resource === 'offers') {
    if (id) {
      const row = await prisma.offer.findUnique({ where: { id } });
      if (!row) return jsonError('Offer not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.offer.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json(rows);
  }

  if (resource === 'events') {
    if (id) {
      const row = await getAcademyEvent(id);
      if (!row) return jsonError('Event not found', 404);
      return NextResponse.json(academyEventToAdminApi(row));
    }
    const rows = await listAcademyEvents();
    return NextResponse.json(rows.map(academyEventToAdminApi));
  }

  if (resource === 'announcements') {
    if (id) {
      const row = await prisma.announcement.findUnique({ where: { id } });
      if (!row) return jsonError('Announcement not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
    return NextResponse.json(rows);
  }

  if (resource === 'facilities') {
    if (id) {
      const row = await prisma.facilityHighlight.findUnique({ where: { id } });
      if (!row) return jsonError('Facility not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.facilityHighlight.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(rows);
  }

  if (resource === 'footer-settings') {
    const row = await prisma.footerSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(row);
  }

  if (resource === 'footer-links') {
    if (id) {
      const row = await prisma.footerLink.findUnique({ where: { id } });
      if (!row) return jsonError('Footer link not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.footerLink.findMany({ orderBy: [{ group: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json(rows);
  }

  if (resource === 'packages') {
    if (id) {
      const row = await prisma.package.findUnique({ where: { id } });
      if (!row) return jsonError('Package not found', 404);
      return NextResponse.json(row);
    }
    const rows = await prisma.package.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return NextResponse.json(rows);
  }

  return jsonError(`Unsupported resource: ${resource}`, 404);
}

async function handlePost(resource: string, body: JsonBody) {
  if (resource === 'programs') {
    const name = toTrimmedString(body.name);
    if (!name) return jsonError('Program name is required');

    const slug = toTrimmedString(body.slug) || slugify(name);
    const row = await prisma.program.create({
      data: {
        name,
        description: toStringOrEmpty(body.description),
        level: toOptionalString(body.level),
        slug,
        highlight: toBoolean(body.highlight, false),
        order: toInteger(body.order, 0),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (resource === 'offers') {
    const name = toTrimmedString(body.name);
    if (!name) return jsonError('Offer name is required');

    const row = await prisma.offer.create({
      data: {
        name,
        pricePerMonth: Math.max(0, toInteger(body.pricePerMonth, 0)),
        badge: toOptionalString(body.badge),
        description: toStringOrEmpty(body.description),
        features: toStringArray(body.features),
        order: toInteger(body.order, 0),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (resource === 'events') {
    const title = toTrimmedString(body.title);
    if (!title) return jsonError('Event title is required');
    const imageUrl = toTrimmedString(body.imageUrl);
    if (!imageUrl) return jsonError('Event image is required');

    const startAt = toDate(body.date) || new Date();
    const endAt = hasOwn(body, 'endAt') ? toDate(body.endAt) : null;
    const published = toBoolean(body.highlight ?? body.published, true);

    const firestoreId = await createAcademyEvent({
      title,
      location: toTrimmedString(body.location) || 'Infinity Campus',
      startAt,
      endAt,
      description: toOptionalString(body.description),
      published,
      imageUrl,
    });

    try {
      const row = await prisma.event.create({
        data: {
          id: firestoreId,
          title,
          description: toOptionalString(body.description),
          date: startAt,
          location: toTrimmedString(body.location) || 'Infinity Campus',
          imageUrl,
          highlight: published,
        },
      });
      return NextResponse.json(row, { status: 201 });
    } catch (prismaError) {
      await deleteAcademyEvent(firestoreId).catch(() => undefined);
      throw prismaError;
    }
  }

  if (resource === 'coaches') {
    const name = toTrimmedString(body.name);
    if (!name) return jsonError('Coach name is required');
    const sport = toTrimmedString(body.sport);
    if (!sport) return jsonError('Coach sport is required');
    const imageUrl = toTrimmedString(body.imageUrl);
    if (!imageUrl) return jsonError('Coach image is required');
    const description = toTrimmedString(body.description);
    if (!description) return jsonError('Coach description is required');

    const row = await prisma.landingCoach.create({
      data: {
        name,
        sport,
        description,
        quote: toOptionalString(body.quote),
        achievements: toStringArray(body.achievements),
        imageUrl,
        order: toInteger(body.order, 0),
        isActive: toBoolean(body.isActive, true),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (resource === 'announcements') {
    const title = toTrimmedString(body.title);
    if (!title) return jsonError('Announcement title is required');

    const row = await prisma.announcement.create({
      data: {
        title,
        body: toStringOrEmpty(body.body),
        imageUrl: toOptionalString(body.imageUrl),
        publishedAt: toDate(body.publishedAt) || new Date(),
        isPinned: toBoolean(body.isPinned, false),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (resource === 'facilities') {
    const name = toTrimmedString(body.name);
    if (!name) return jsonError('Facility name is required');

    const row = await prisma.facilityHighlight.create({
      data: {
        name,
        description: toStringOrEmpty(body.description),
        imageUrl: toOptionalString(body.imageUrl),
        order: toInteger(body.order, 0),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (resource === 'footer-links') {
    const label = toTrimmedString(body.label);
    const url = toTrimmedString(body.url);
    if (!label || !url) return jsonError('Footer link label and url are required');

    const row = await prisma.footerLink.create({
      data: {
        label,
        url,
        group: toTrimmedString(body.group) || 'quick-links',
        order: toInteger(body.order, 0),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (resource === 'packages') {
    const name = toTrimmedString(body.name);
    if (!name) return jsonError('Package name is required');

    const pricingType = (toTrimmedString(body.pricingType) || 'FIXED').toUpperCase();
    const currentPriceJod = pricingType === 'MANUAL' ? null : Math.max(0, toInteger(body.currentPriceJod, 0));
    const descriptionBullets = toStringArray(body.descriptionBullets);

    const row = await prisma.package.create({
      data: {
        sportType: toTrimmedString(body.sportType) || 'Other',
        name,
        description: toOptionalString(body.description),
        descriptionBullets: descriptionBullets.length > 0 ? descriptionBullets : undefined,
        sessionsCount: Math.max(0, toInteger(body.sessionsCount, 0)),
        trackingType: (toTrimmedString(body.trackingType) || 'SESSIONS').toUpperCase(),
        pricingType,
        currentPriceJod,
        timeSlots: hasOwn(body, 'timeSlots') ? (body.timeSlots as object) : undefined,
        isActive: toBoolean(body.isActive, true),
        sortOrder: Math.max(0, toInteger(body.sortOrder, 0)),
      },
    });
    return NextResponse.json(row, { status: 201 });
  }

  return jsonError(`POST is not supported for resource: ${resource}`, 405);
}

async function handlePatch(resource: string, id: string | null, body: JsonBody) {
  if (resource === 'hero') {
    const existing = await prisma.heroSection.findFirst({ orderBy: { updatedAt: 'desc' } });
    const data: JsonBody = {};

    if (hasOwn(body, 'title')) data.title = toTrimmedString(body.title) || '';
    if (hasOwn(body, 'subtitle')) data.subtitle = toTrimmedString(body.subtitle) || '';
    if (hasOwn(body, 'primaryCta')) data.primaryCta = toTrimmedString(body.primaryCta) || '';
    if (hasOwn(body, 'primaryUrl')) data.primaryUrl = toTrimmedString(body.primaryUrl) || '';
    if (hasOwn(body, 'secondaryCta')) data.secondaryCta = toOptionalString(body.secondaryCta);
    if (hasOwn(body, 'secondaryUrl')) data.secondaryUrl = toOptionalString(body.secondaryUrl);
    if (hasOwn(body, 'backgroundImageUrl')) data.backgroundImageUrl = toOptionalString(body.backgroundImageUrl);
    if (hasOwn(body, 'backgroundVideoUrl')) data.backgroundVideoUrl = toOptionalString(body.backgroundVideoUrl);

    if (existing) {
      const row = await prisma.heroSection.update({
        where: { id: existing.id },
        data: data as never,
      });
      return NextResponse.json(row);
    }

    const row = await prisma.heroSection.create({
      data: {
        title: toTrimmedString(body.title) || 'Elevating Jordanian Athletes',
        subtitle:
          toTrimmedString(body.subtitle) ||
          'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities.',
        primaryCta: toTrimmedString(body.primaryCta) || 'Explore Programs',
        primaryUrl: toTrimmedString(body.primaryUrl) || '/sports',
        secondaryCta: toOptionalString(body.secondaryCta),
        secondaryUrl: toOptionalString(body.secondaryUrl),
        backgroundImageUrl: toOptionalString(body.backgroundImageUrl),
        backgroundVideoUrl: toOptionalString(body.backgroundVideoUrl),
      },
    });
    return NextResponse.json(row);
  }

  if (resource === 'programs') {
    if (!id) return jsonError('Program id is required', 400);
    const data: JsonBody = {};
    if (hasOwn(body, 'name')) data.name = toTrimmedString(body.name) || '';
    if (hasOwn(body, 'description')) data.description = toStringOrEmpty(body.description);
    if (hasOwn(body, 'level')) data.level = toOptionalString(body.level);
    if (hasOwn(body, 'slug')) data.slug = toTrimmedString(body.slug) || '';
    if (hasOwn(body, 'highlight')) data.highlight = toBoolean(body.highlight, false);
    if (hasOwn(body, 'order')) data.order = toInteger(body.order, 0);
    const row = await prisma.program.update({ where: { id }, data: data as never });
    return NextResponse.json(row);
  }

  if (resource === 'offers') {
    if (!id) return jsonError('Offer id is required', 400);
    const data: JsonBody = {};
    if (hasOwn(body, 'name')) data.name = toTrimmedString(body.name) || '';
    if (hasOwn(body, 'pricePerMonth')) data.pricePerMonth = Math.max(0, toInteger(body.pricePerMonth, 0));
    if (hasOwn(body, 'badge')) data.badge = toOptionalString(body.badge);
    if (hasOwn(body, 'description')) data.description = toStringOrEmpty(body.description);
    if (hasOwn(body, 'features')) data.features = toStringArray(body.features);
    if (hasOwn(body, 'order')) data.order = toInteger(body.order, 0);
    const row = await prisma.offer.update({ where: { id }, data: data as never });
    return NextResponse.json(row);
  }

  if (resource === 'events') {
    if (!id) return jsonError('Event id is required', 400);
    const existing = await getAcademyEvent(id);
    if (!existing) return jsonError('Event not found', 404);

    const patchFs: Parameters<typeof updateAcademyEvent>[1] = {};
    if (hasOwn(body, 'title')) patchFs.title = toTrimmedString(body.title) || '';
    if (hasOwn(body, 'description')) patchFs.description = toOptionalString(body.description);
    if (hasOwn(body, 'date')) patchFs.startAt = toDate(body.date) || new Date();
    if (hasOwn(body, 'location')) patchFs.location = toTrimmedString(body.location) || 'Infinity Campus';
    if (hasOwn(body, 'endAt')) patchFs.endAt = toDate(body.endAt);
    if (hasOwn(body, 'imageUrl')) {
      const imageUrl = toTrimmedString(body.imageUrl);
      if (!imageUrl) return jsonError('Event image is required');
      patchFs.imageUrl = imageUrl;
    }
    if (hasOwn(body, 'highlight') || hasOwn(body, 'published')) {
      patchFs.published = toBoolean(body.highlight ?? body.published, true);
    }

    await updateAcademyEvent(id, patchFs);

    const fresh = await getAcademyEvent(id);
    if (!fresh) return jsonError('Event not found', 404);

    await prisma.event.upsert({
      where: { id },
      create: {
        id: fresh.id,
        title: fresh.title,
        description: fresh.description,
        date: fresh.startAt ?? new Date(),
        location: fresh.location || 'Infinity Campus',
        imageUrl: fresh.imageUrl,
        highlight: fresh.published,
      },
      update: {
        title: fresh.title,
        description: fresh.description,
        date: fresh.startAt ?? new Date(),
        location: fresh.location || 'Infinity Campus',
        imageUrl: fresh.imageUrl,
        highlight: fresh.published,
      },
    });
    const row = await prisma.event.findUnique({ where: { id } });
    return NextResponse.json(row);
  }

  if (resource === 'coaches') {
    if (!id) return jsonError('Coach id is required', 400);
    const data: JsonBody = {};
    if (hasOwn(body, 'name')) data.name = toTrimmedString(body.name) || '';
    if (hasOwn(body, 'sport')) data.sport = toTrimmedString(body.sport) || '';
    if (hasOwn(body, 'description')) data.description = toTrimmedString(body.description) || '';
    if (hasOwn(body, 'quote')) data.quote = toOptionalString(body.quote);
    if (hasOwn(body, 'achievements')) data.achievements = toStringArray(body.achievements);
    if (hasOwn(body, 'imageUrl')) {
      const imageUrl = toTrimmedString(body.imageUrl);
      if (!imageUrl) return jsonError('Coach image is required');
      data.imageUrl = imageUrl;
    }
    if (hasOwn(body, 'order')) data.order = toInteger(body.order, 0);
    if (hasOwn(body, 'isActive')) data.isActive = toBoolean(body.isActive, true);
    const row = await prisma.landingCoach.update({ where: { id }, data: data as never });
    return NextResponse.json(row);
  }

  if (resource === 'announcements') {
    if (!id) return jsonError('Announcement id is required', 400);
    const data: JsonBody = {};
    if (hasOwn(body, 'title')) data.title = toTrimmedString(body.title) || '';
    if (hasOwn(body, 'body')) data.body = toStringOrEmpty(body.body);
    if (hasOwn(body, 'imageUrl')) data.imageUrl = toOptionalString(body.imageUrl);
    if (hasOwn(body, 'publishedAt')) data.publishedAt = toDate(body.publishedAt) || new Date();
    if (hasOwn(body, 'isPinned')) data.isPinned = toBoolean(body.isPinned, false);
    const row = await prisma.announcement.update({ where: { id }, data: data as never });
    return NextResponse.json(row);
  }

  if (resource === 'facilities') {
    if (!id) return jsonError('Facility id is required', 400);
    const data: JsonBody = {};
    if (hasOwn(body, 'name')) data.name = toTrimmedString(body.name) || '';
    if (hasOwn(body, 'description')) data.description = toStringOrEmpty(body.description);
    if (hasOwn(body, 'imageUrl')) data.imageUrl = toOptionalString(body.imageUrl);
    if (hasOwn(body, 'order')) data.order = toInteger(body.order, 0);
    const row = await prisma.facilityHighlight.update({ where: { id }, data: data as never });
    return NextResponse.json(row);
  }

  if (resource === 'footer-settings') {
    const existing = await prisma.footerSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    const data: JsonBody = {};

    if (hasOwn(body, 'address')) data.address = toTrimmedString(body.address) || '';
    if (hasOwn(body, 'phone')) data.phone = toTrimmedString(body.phone) || '';
    if (hasOwn(body, 'email')) data.email = toTrimmedString(body.email) || '';
    if (hasOwn(body, 'contactRecipientEmail')) {
      data.contactRecipientEmail = toOptionalString(body.contactRecipientEmail);
    }
    if (hasOwn(body, 'socialLinks')) data.socialLinks = Array.isArray(body.socialLinks) ? body.socialLinks : [];

    if (existing) {
      const row = await prisma.footerSettings.update({
        where: { id: existing.id },
        data: data as never,
      });
      return NextResponse.json(row);
    }

    const row = await prisma.footerSettings.create({
      data: {
        address: toTrimmedString(body.address) || 'Shemisani, Princess Alia College',
        phone: toTrimmedString(body.phone) || '07 9624 4059',
        email: toTrimmedString(body.email) || 'infinitysportsacademyjo@gmail.com',
        contactRecipientEmail:
          toOptionalString(body.contactRecipientEmail) ||
          toTrimmedString(body.email) ||
          'infinitysportsacademyjo@gmail.com',
        socialLinks: Array.isArray(body.socialLinks) ? body.socialLinks : [],
      },
    });
    return NextResponse.json(row);
  }

  if (resource === 'footer-links') {
    if (!id) return jsonError('Footer link id is required', 400);
    const data: JsonBody = {};
    if (hasOwn(body, 'label')) data.label = toTrimmedString(body.label) || '';
    if (hasOwn(body, 'url')) data.url = toTrimmedString(body.url) || '';
    if (hasOwn(body, 'group')) data.group = toTrimmedString(body.group) || 'quick-links';
    if (hasOwn(body, 'order')) data.order = toInteger(body.order, 0);
    const row = await prisma.footerLink.update({ where: { id }, data: data as never });
    return NextResponse.json(row);
  }

  if (resource === 'packages') {
    if (!id) return jsonError('Package id is required', 400);
    const data: JsonBody = {};

    if (hasOwn(body, 'sportType')) data.sportType = toTrimmedString(body.sportType) || 'Other';
    if (hasOwn(body, 'name')) data.name = toTrimmedString(body.name) || '';
    if (hasOwn(body, 'description')) data.description = toOptionalString(body.description);
    if (hasOwn(body, 'descriptionBullets')) {
      const bullets = toStringArray(body.descriptionBullets);
      data.descriptionBullets = bullets.length > 0 ? bullets : null;
    }
    if (hasOwn(body, 'sessionsCount')) data.sessionsCount = Math.max(0, toInteger(body.sessionsCount, 0));
    if (hasOwn(body, 'trackingType')) data.trackingType = (toTrimmedString(body.trackingType) || 'SESSIONS').toUpperCase();
    if (hasOwn(body, 'pricingType')) {
      data.pricingType = (toTrimmedString(body.pricingType) || 'FIXED').toUpperCase();
    }
    if (hasOwn(body, 'currentPriceJod')) {
      const pricingType =
        (hasOwn(body, 'pricingType')
          ? toTrimmedString(body.pricingType)
          : undefined) || undefined;
      const effectivePricing = pricingType ? pricingType.toUpperCase() : undefined;
      data.currentPriceJod =
        effectivePricing === 'MANUAL'
          ? null
          : Math.max(0, toInteger(body.currentPriceJod, 0));
    }
    if (hasOwn(body, 'timeSlots')) data.timeSlots = body.timeSlots as object;
    if (hasOwn(body, 'isActive')) data.isActive = toBoolean(body.isActive, true);
    if (hasOwn(body, 'sortOrder')) data.sortOrder = Math.max(0, toInteger(body.sortOrder, 0));

    // If name changed, cascade to PackageRegistration records
    const newName = hasOwn(body, 'name') ? toTrimmedString(body.name) : null;
    let oldName: string | null = null;
    if (newName) {
      const existing = await prisma.package.findUnique({ where: { id }, select: { name: true } });
      oldName = existing?.name ?? null;
    }

    const row = await prisma.package.update({ where: { id }, data: data as never });

    // Cascade: update packageName on all registrations that had the old name
    if (newName && oldName && newName !== oldName) {
      await prisma.packageRegistration.updateMany({
        where: { packageName: oldName },
        data: { packageName: newName },
      });
    }

    return NextResponse.json(row);
  }

  return jsonError(`PATCH is not supported for resource: ${resource}`, 405);
}

async function handleDelete(resource: string, id: string | null) {
  if (!id) return jsonError('Resource id is required', 400);

  if (resource === 'programs') {
    await prisma.program.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'offers') {
    await prisma.offer.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'events') {
    await deleteAcademyEvent(id);
    try {
      await prisma.event.delete({ where: { id } });
    } catch {
      // Row may only exist in Firestore if DB was out of sync
    }
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'coaches') {
    await prisma.landingCoach.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'announcements') {
    await prisma.announcement.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'facilities') {
    await prisma.facilityHighlight.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'footer-links') {
    await prisma.footerLink.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === 'packages') {
    await prisma.package.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return jsonError(`DELETE is not supported for resource: ${resource}`, 405);
}

async function withErrorBoundary(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    if (message.includes('Unique constraint failed')) {
      return jsonError(message, 409);
    }
    if (message.includes('Record to delete does not exist') || message.includes('Record to update not found')) {
      return jsonError(message, 404);
    }
    console.error('[admin-api] request failed:', error);
    return jsonError(message, 500);
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  return withErrorBoundary(async () => {
    const params = await resolveParams(context);
    const resource = params.resource;
    const id = getId(params);
    return handleGet(resource, id);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withErrorBoundary(async () => {
    const params = await resolveParams(context);
    const body = await readJson(request);
    return handlePost(params.resource, body);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorBoundary(async () => {
    const params = await resolveParams(context);
    const id = getId(params);
    const body = await readJson(request);
    return handlePatch(params.resource, id, body);
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorBoundary(async () => {
    const params = await resolveParams(context);
    const id = getId(params);
    return handleDelete(params.resource, id);
  });
}
