import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Company,
  Member,
  Booking,
  Subscription,
  Invoice,
  Coach,
  Class,
  ClassEnrollment,
  InventoryItem,
  StaffTask,
  CompanySettings,
  FooterSettings,
  Prisma,
  CompanyStatus,
  MemberStatus,
  BookingStatus,
  SubscriptionStatus,
  InvoiceStatus,
  CoachStatus,
  ClassStatus,
  InventoryStatus,
  TaskStatus,
} from '@prisma/client';
// @ts-ignore - PDFKit has CommonJS export
const PDFDocument = require('pdfkit');
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Writable } from 'stream';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  // Companies
  async getCompanies(): Promise<Company[]> {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompany(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        members: true,
        bookings: true,
        subscriptions: true,
        invoices: true,
      },
    });
  }

  async createCompany(data: Prisma.CompanyCreateInput): Promise<Company> {
    // Check if company with same name already exists
    const existing = await this.prisma.company.findFirst({
      where: { name: data.name },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.company.create({ data });
  }

  async updateCompany(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async deleteCompany(id: string): Promise<void> {
    await this.prisma.company.delete({ where: { id } });
  }

  // Members
  async getMembers(companyId?: string): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        subscriptions: true,
        bookings: true,
        enrollments: {
          include: { class: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMember(id: string): Promise<Member | null> {
    return this.prisma.member.findUnique({
      where: { id },
      include: {
        company: true,
        subscriptions: true,
        bookings: true,
        enrollments: {
          include: { class: true },
        },
      },
    });
  }

  async createMember(data: Prisma.MemberCreateInput): Promise<Member> {
    return this.prisma.member.create({ data });
  }

  async updateMember(id: string, data: Prisma.MemberUpdateInput): Promise<Member> {
    return this.prisma.member.update({
      where: { id },
      data,
    });
  }

  async deleteMember(id: string): Promise<void> {
    await this.prisma.member.delete({ where: { id } });
  }

  // Bookings
  async getBookings(companyId?: string, startDate?: Date, endDate?: Date): Promise<Booking[]> {
    try {
      const where: Prisma.BookingWhereInput = {};
      
      if (companyId) {
        where.companyId = companyId;
      }
      
      if (startDate && endDate) {
        where.startTime = {
          gte: startDate,
          lte: endDate,
        };
      }
      
      const bookings = await this.prisma.booking.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          program: {
            select: {
              id: true,
              name: true,
            },
          },
          facility: {
            select: {
              id: true,
              name: true,
            },
          },
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          coach: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });
      
      return bookings;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Return empty array instead of throwing to prevent 500 errors
      // Log the error for debugging
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return [];
    }
  }

  async getBooking(id: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({
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
  }

  async createBooking(data: Prisma.BookingCreateInput): Promise<Booking> {
    return this.prisma.booking.create({ data });
  }

  async updateBooking(id: string, data: Prisma.BookingUpdateInput): Promise<Booking> {
    return this.prisma.booking.update({
      where: { id },
      data,
    });
  }

  async deleteBooking(id: string): Promise<void> {
    await this.prisma.booking.delete({ where: { id } });
  }

  // Blocked slots (static booking blocks; isBlocked=false makes the slot free for public booking)
  async getBlockedSlots(): Promise<{ id: string; dayOfWeek: string; courtType: string; time: string; isBlocked: boolean; label: string | null; startDate: string | null; endDate: string | null }[]> {
    try {
      const rows = await (this.prisma as any).blockedSlot.findMany({
        orderBy: [{ label: 'asc' }, { dayOfWeek: 'asc' }, { courtType: 'asc' }, { time: 'asc' }],
      });
      return rows.map((r: any) => ({
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        courtType: r.courtType,
        time: r.time,
        isBlocked: r.isBlocked,
        label: r.label ?? null,
        startDate: r.startDate ? r.startDate.toISOString() : null,
        endDate: r.endDate ? r.endDate.toISOString() : null,
      }));
    } catch (e: any) {
      console.error('getBlockedSlots error', e);
      throw new InternalServerErrorException(
        e?.message || 'Could not load blocked slots. Ensure database migrations are run (npm run prisma:migrate).',
      );
    }
  }

  async updateBlockedSlot(id: string, data: { isBlocked?: boolean; label?: string | null; startDate?: string | null; endDate?: string | null }): Promise<{ id: string; dayOfWeek: string; courtType: string; time: string; isBlocked: boolean; label: string | null; startDate: string | null; endDate: string | null } | null> {
    const updateData: any = { updatedAt: new Date() };
    if (data.isBlocked !== undefined) updateData.isBlocked = data.isBlocked;
    if (data.label !== undefined) updateData.label = data.label;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    const row = await (this.prisma as any).blockedSlot.update({
      where: { id },
      data: updateData,
    });
    return {
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      courtType: row.courtType,
      time: row.time,
      isBlocked: row.isBlocked,
      label: row.label ?? null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
    };
  }

  async createBlockedSlot(data: { dayOfWeek: string; courtType: string; time: string; isBlocked?: boolean; label?: string | null; startDate?: string | null; endDate?: string | null }): Promise<{ id: string; dayOfWeek: string; courtType: string; time: string; isBlocked: boolean; label: string | null; startDate: string | null; endDate: string | null }> {
    const row = await (this.prisma as any).blockedSlot.create({
      data: {
        dayOfWeek: data.dayOfWeek,
        courtType: data.courtType,
        time: data.time,
        isBlocked: data.isBlocked ?? true,
        label: data.label ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
    return {
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      courtType: row.courtType,
      time: row.time,
      isBlocked: row.isBlocked,
      label: row.label ?? null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
    };
  }

  async createBlockedSlotsBulk(data: { courtType: string; time: string; daysOfWeek: string[]; label?: string | null; startDate?: string | null; endDate?: string | null }): Promise<{ id: string; dayOfWeek: string; courtType: string; time: string; isBlocked: boolean; label: string | null; startDate: string | null; endDate: string | null }[]> {
    const created: any[] = [];
    for (const dayOfWeek of data.daysOfWeek) {
      try {
        const row = await this.createBlockedSlot({
          dayOfWeek,
          courtType: data.courtType,
          time: data.time,
          isBlocked: true,
          label: data.label ?? null,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
        });
        created.push(row);
      } catch (e: any) {
        // P2002 = unique constraint (dayOfWeek, courtType, time) already exists – skip this slot
        if (e?.code === 'P2002') continue;
        throw e;
      }
    }
    return created;
  }

  async deleteBlockedSlot(id: string): Promise<void> {
    await (this.prisma as any).blockedSlot.delete({ where: { id } });
  }

  async deleteBlockedSlotsByLabel(label: string): Promise<number> {
    const result = await (this.prisma as any).blockedSlot.deleteMany({ where: { label } });
    return result.count;
  }

  // Subscriptions
  async getSubscriptions(companyId?: string, memberId?: string): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        companyId: companyId || undefined,
        memberId: memberId || undefined,
      },
      include: {
        company: true,
        offer: true,
        member: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: {
        company: true,
        offer: true,
        member: true,
        invoices: true,
      },
    });
  }

  async createSubscription(data: Prisma.SubscriptionCreateInput): Promise<Subscription> {
    return this.prisma.subscription.create({ data });
  }

  async updateSubscription(id: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data,
    });
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.prisma.subscription.delete({ where: { id } });
  }

  // Invoices
  async getInvoices(
    companyId?: string,
    status?: InvoiceStatus,
    startDate?: string,
    endDate?: string,
  ): Promise<Invoice[]> {
    const where: any = {
      companyId: companyId || undefined,
      status: status || undefined,
    };

    // Add date range filtering
    if (startDate || endDate) {
      where.issuedAt = {};
      if (startDate) {
        where.issuedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        where.issuedAt.lte = end;
      }
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        company: true,
        subscription: {
          include: {
            offer: true,
          },
        },
        member: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        subscription: true,
        member: true,
      },
    });
  }

  async getInvoicePdfBuffer(id: string): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const invoice = await this.prisma.invoice.findUnique({ where: { id } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      const num = (invoice.number ?? invoice.id ?? 'invoice').toString();
      const safe = num.replace(/[^A-Za-z0-9-_]/g, '_');
      const filePath = join(process.cwd(), 'uploads', 'invoices', `${safe}.pdf`);
      
      // Try to read cached PDF first (fast path)
      if (existsSync(filePath)) {
        try {
          const buffer = await readFile(filePath);
          return { buffer, filename: `${num}.pdf` };
        } catch (readError) {
          console.warn(`Failed to read cached PDF for ${num}, regenerating:`, readError);
          // Fall through to regenerate
        }
      }
      
      // Generate PDF in-memory when file is missing (e.g. after deploy on ephemeral disk)
      // Optimize: Parse meta and get company profile in parallel
      let meta: Record<string, unknown> = {};
      try {
        if (invoice.description && typeof invoice.description === 'string') {
          const p = JSON.parse(invoice.description);
          if (p && typeof p === 'object') meta = p;
        }
      } catch {
        /* ignore */
      }
      
      // Safely get amountPaid and new fields - they might not exist in the Prisma type yet
      const invoiceAny = invoice as any;
      const amountPaid = invoiceAny.amountPaid != null ? Number(invoiceAny.amountPaid) : 0;
      
      // Merge database fields with meta (for backward compatibility)
      if (invoiceAny.companyEmail) meta.companyEmail = invoiceAny.companyEmail;
      if (invoiceAny.companyPhone) meta.companyPhone = invoiceAny.companyPhone;
      if (invoiceAny.note) meta.note = invoiceAny.note;
      
      // Get company profile (cache this if possible to avoid repeated DB queries)
      const companyProfile = await this.getCompanyProfile();
      if (!meta.companyName) meta.companyName = companyProfile.name;
      if (!meta.companyAddress) meta.companyAddress = companyProfile.address;
      if (!meta.companyEmail) meta.companyEmail = companyProfile.email;
      if (!meta.companyPhone) meta.companyPhone = companyProfile.phone;
      
      // Generate PDF buffer
      const buffer = await this.generateInvoicePdfToBuffer({
        number: num,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        amount: Number(invoice.amount) || 0,
        amountPaid,
        meta,
      });
      
      // Cache the generated PDF to disk for future requests (async, don't wait)
      this.cachePdfToDisk(filePath, buffer).catch((err) => {
        console.warn(`Failed to cache PDF for ${num}:`, err);
      });
      
      return { buffer, filename: `${num}.pdf` };
    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      console.error('Error stack:', error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to generate invoice PDF: ${error.message || 'Unknown error'}`);
    }
  }

  // Helper to cache PDF to disk asynchronously (non-blocking)
  private async cachePdfToDisk(filePath: string, buffer: Buffer): Promise<void> {
    try {
      const dir = join(filePath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      await import('fs/promises').then((fs) => fs.writeFile(filePath, buffer));
    } catch (error) {
      // Silently fail - caching is optional
      console.warn('Failed to cache PDF:', error);
    }
  }

  // Get company profile from FooterSettings (single source of truth with landing page)
  private async getCompanyProfile(): Promise<{ name: string; address: string; email: string; phone: string }> {
    // Fallback values match landing page defaults
    const defaults = {
      name: 'Infinity Sporty',
      address: 'Shemisani, Princess Alia College',
      email: 'infinitysportsacademyjo@gmail.com',
      phone: '07 9624 4059',
    };

    try {
      const footerSettings = await this.prisma.footerSettings.findFirst();
      if (footerSettings) {
        return {
          name: defaults.name, // Company name not in FooterSettings, use default
          address: footerSettings.address || defaults.address,
          email: footerSettings.email || defaults.email,
          phone: footerSettings.phone || defaults.phone,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch FooterSettings, using defaults:', error);
    }

    return defaults;
  }

  async createInvoice(
    data: Prisma.InvoiceCreateInput & { generatePdf?: boolean } & Record<string, unknown>
  ): Promise<Invoice> {
    const d = (data ?? {}) as Record<string, unknown>;
    const companyId = d?.company && typeof d.company === 'object' && (d.company as any)?.connect?.id
      ? String((d.company as any).connect.id).trim()
      : '';
    if (!companyId) {
      throw new BadRequestException('company.connect.id is required');
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException('Company not found');
    }

    // Get company profile from FooterSettings (single source of truth)
    const companyProfile = await this.getCompanyProfile();

    const generatePdf =
      Boolean(d.generatePdf) || Boolean(d.clientName) || (Array.isArray(d.lineItems) && d.lineItems.length > 0);
    const paymentMethod: 'CARD' | 'CASH' = (d.paymentMethod === 'CASH' ? 'CASH' : 'CARD') as 'CARD' | 'CASH';

    const invoiceNumber = d.number && String(d.number).trim() ? String(d.number).trim() : await this.generateInvoiceNumber();
    const issuedAtIso = d.issuedAt ? String(d.issuedAt) : new Date().toISOString();
    const issuedAt = new Date(issuedAtIso);
    if (Number.isNaN(issuedAt.getTime())) {
      throw new BadRequestException('issuedAt must be a valid date');
    }

    // Use provided values or fallback to FooterSettings (single source of truth)
    const meta = {
      v: 1,
      companyName: (d.companyName && String(d.companyName)) || companyProfile.name,
      companyAddress: (d.companyAddress && String(d.companyAddress)) || companyProfile.address,
      companyEmail: (d.companyEmail && String(d.companyEmail)) || companyProfile.email,
      companyPhone: (d.companyPhone && String(d.companyPhone)) || companyProfile.phone,
      clientName: (d.clientName && String(d.clientName)) || '',
      clientEmail: (d.clientEmail && String(d.clientEmail)) || '',
      clientAddress: (d.clientAddress && String(d.clientAddress)) || '',
      currency: (d.currency && String(d.currency)) || 'JOD',
      paymentMethod,
      lineItems: Array.isArray(d.lineItems) ? d.lineItems : [],
      subtotal: typeof d.subtotal === 'number' ? d.subtotal : null,
      tax: typeof d.tax === 'number' ? d.tax : null,
      discount: typeof d.discount === 'number' ? d.discount : null,
      notes: (d.notes && String(d.notes)) || null,
      note: (d.note && String(d.note)) || null,
      pdfPath: null as null | string,
    };

    const amount = Math.round(Number(d.amount)) || 0;
    const dueVal = d.dueDate ? new Date(String(d.dueDate)) : null;
    const dueDate = dueVal && !Number.isNaN(dueVal.getTime()) ? dueVal : undefined;
    const paidVal = d.paidAt ? new Date(String(d.paidAt)) : null;
    const paidAt = paidVal && !Number.isNaN(paidVal.getTime()) ? paidVal : undefined;

    const amountPaid = Math.round(Number(d.amountPaid) || 0);
    let status = ((d.status && String(d.status)) || 'DRAFT') as InvoiceStatus;
    
    // Auto-determine status based on payment
    if (amountPaid > 0 && amountPaid < amount) {
      status = 'PARTIALLY_PAID';
    } else if (amountPaid >= amount && amount > 0) {
      status = 'PAID';
    }

    const createData: Prisma.InvoiceCreateInput = {
      number: invoiceNumber,
      amount,
      amountPaid,
      currency: meta.currency,
      status,
      issuedAt,
      dueDate: dueDate ?? undefined,
      paidAt: paidAt ?? undefined,
      description: JSON.stringify(meta),
      companyEmail: (d.companyEmail && String(d.companyEmail)) || null,
      companyPhone: (d.companyPhone && String(d.companyPhone)) || null,
      note: (d.note && String(d.note)) || null,
      company: { connect: { id: companyId } },
      ...(d.member && typeof d.member === 'object' && (d.member as any)?.connect?.id
        ? { member: { connect: { id: String((d.member as any).connect.id) } } }
        : {}),
      ...(d.subscription && typeof d.subscription === 'object' && (d.subscription as any)?.connect?.id
        ? { subscription: { connect: { id: String((d.subscription as any).connect.id) } } }
        : {}),
    };

    const created = await this.prisma.invoice.create({ data: createData });

    // Generate PDF asynchronously (don't block invoice creation)
    if (generatePdf) {
      // Fire and forget - generate PDF in background
      this.generateInvoicePdf({
        number: created.number,
        issuedAt: created.issuedAt,
        dueDate: created.dueDate,
        currency: created.currency,
        amount: created.amount,
        meta,
      })
        .then((pdfPath) => {
          (meta as any).pdfPath = pdfPath;
          return this.prisma.invoice.update({
            where: { id: created.id },
            data: { description: JSON.stringify(meta) },
          });
        })
        .catch((err) => {
          console.error('createInvoice: generateInvoicePdf failed', err);
        });
    }

    return created;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Try a few times in case concurrent creates cause a unique constraint collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const yearPrefix = `INV-${year}-`;
      const countThisYear = await this.prisma.invoice.count({
        where: { number: { startsWith: yearPrefix } },
      });
      const seq = countThisYear + 1 + attempt;
      const candidate = `${yearPrefix}${String(seq).padStart(6, '0')}`;

      const exists = await this.prisma.invoice.findUnique({ where: { number: candidate } });
      if (!exists) return candidate;
    }

    // Fallback if something is very wrong.
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `INV-${y}${m}${d}-${rand}`;
  }

  private async generateInvoicePdf(input: {
    number: string;
    issuedAt: Date;
    dueDate: Date | null;
    currency: string;
    amount: number;
    meta: any;
  }): Promise<string> {
    const uploadsDir = join(process.cwd(), 'uploads', 'invoices');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

    const safeNumber = input.number.replace(/[^A-Za-z0-9-_]/g, '_');
    const filename = `${safeNumber}.pdf`;
    const absolutePath = join(uploadsDir, filename);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = createWriteStream(absolutePath);
    doc.pipe(stream);

    const candidateLogoPaths = [
      join(process.cwd(), 'apps', 'web', 'public', 'infinity-logo.png'),
      join(process.cwd(), 'apps', 'portal', 'public', 'infinity-logo.png'),
    ];
    const logoPath = (input.meta?.logoPath || candidateLogoPaths.find((p) => existsSync(p))) || null;

    // Ensure company info is populated from FooterSettings if missing
    const companyProfile = await this.getCompanyProfile();
    const enrichedMeta = {
      ...input.meta,
      companyName: input.meta?.companyName || companyProfile.name,
      companyAddress: input.meta?.companyAddress || companyProfile.address,
      companyEmail: input.meta?.companyEmail || companyProfile.email,
      companyPhone: input.meta?.companyPhone || companyProfile.phone,
    };

    this.drawInvoiceContent(doc, { ...input, meta: enrichedMeta, logoPath });

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', (e) => reject(e));
    });

    return `/uploads/invoices/${filename}`;
  }

  private drawInvoiceContent(
    doc: any,
    input: {
      number: string;
      issuedAt: Date;
      dueDate: Date | null;
      currency: string;
      amount: number;
      amountPaid?: number;
      meta: Record<string, unknown>;
      logoPath?: string | null;
    },
  ): void {
    // Premium minimalist invoice design - EXACT layout specification
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    
    // Page setup: centered content container with max width
    const maxContentWidth = 315; // ~900px equivalent in points (900/2.834 = 317, rounded to 315)
    const sidePadding = 48; // 48-64px padding (48pt = 48px at 72dpi)
    const contentStartX = (pageWidth - maxContentWidth) / 2; // Center the content
    const contentWidth = maxContentWidth;
    const topMargin = 60;
    const bottomMargin = 60;
    
    // ===================== HEADER (STRICT 2-COLUMN LAYOUT) =====================
    const headerY = topMargin;
    
    // STRICT COLUMN LAYOUT: Fixed widths, no overlap
    const leftColumnX = contentStartX;
    const leftColumnWidth = Math.floor(contentWidth * 0.50); // 50% of container
    const rightColumnX = contentStartX + leftColumnWidth + 40; // Gap of 40px between columns
    const rightColumnWidth = Math.floor(contentWidth * 0.40); // 40% of container
    
    // LEFT COLUMN: Company Info (stacked vertically, NO wrapping)
    let currentY = headerY;
    
    // Company Name
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827');
    doc.text('Infinity Sporty', leftColumnX, currentY, { width: leftColumnWidth });
    currentY += 28;
    
    // Company Details (ENGLISH ONLY, one line per item)
    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    const companyDetails = [
      'Tel: 07 9624 4059',
      'Location: Shemisani, Princess Alia College',
      'Email: infinitysportsacademyjo@gmail.com',
    ];
    
    // Each detail is rendered as a separate block with proper spacing
    // Using sufficient spacing to prevent overlap even if text wraps
    const lineGap = 4; // Spacing between wrapped lines within the same item
    const itemSpacing = 18; // Spacing between different items (ensures no overlap)
    
    companyDetails.forEach((detail, index) => {
      // Add extra spacing before email (2 lines = ~28px for 9pt font)
      if (detail.includes('Email:')) {
        currentY += 28; // Move down by 2 lines before email
      }
      
      // Render each detail as its own block with proper line spacing
      doc.text(detail, leftColumnX, currentY, { 
        width: leftColumnWidth, 
        lineGap: lineGap // Proper spacing between wrapped lines within this item
      });
      // Move to next item with proper spacing to ensure no overlap
      currentY += itemSpacing;
    });
    
    const leftColumnBottom = currentY;
    
    // RIGHT COLUMN: Invoice Meta (right-aligned, stacked vertically)
    currentY = headerY;
    
    // Invoice Title
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#111827');
    doc.text('INVOICE', rightColumnX, currentY, { align: 'right', width: rightColumnWidth });
    currentY += 32;
    
    // Invoice Meta Lines (right-aligned)
    const issuedAt = input.issuedAt ? new Date(input.issuedAt) : new Date();
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;
    
    const metaLines: Array<[string, string]> = [
      ['Invoice No:', input.number],
      ['Issue Date:', issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })],
      ['Due Date:', dueDate ? dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'],
      ['Currency:', input.currency || 'JOD'],
    ];
    
    doc.font('Helvetica').fontSize(9).fillColor('#6B7280');
    const lineHeight = 14; // Line height for invoice meta lines
    metaLines.forEach(([label, value]) => {
      const fullLine = `${label} ${value}`;
      doc.text(fullLine, rightColumnX, currentY, { align: 'right', width: rightColumnWidth });
      currentY += lineHeight;
    });
    
    // Tax Number (right-aligned, below invoice meta)
    currentY += 4; // Small spacing before tax number
    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    doc.text('Tax Number: 40265234', rightColumnX, currentY, { align: 'right', width: rightColumnWidth });
    currentY += 18;
    
    const rightColumnBottom = currentY;
    
    // Divider: Full width, 32px margin from bottom of tallest column
    const maxHeaderHeight = Math.max(leftColumnBottom, rightColumnBottom);
    const dividerY = maxHeaderHeight + 32;
    doc.moveTo(contentStartX, dividerY).lineTo(contentStartX + contentWidth, dividerY).lineWidth(0.5).strokeColor('#D1D5DB').stroke();

    // ===================== ISSUED TO SECTION =====================
    const issuedToY = dividerY + 25;
    const clientName = (input.meta?.clientName as string) || '';
    const clientEmail = (input.meta?.clientEmail as string) || '';
    const clientAddress = (input.meta?.clientAddress as string) || '';
    
    // Title: "ISSUED TO:"
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827');
    doc.text('ISSUED TO:', contentStartX, issuedToY);
    
    // Customer details (left-aligned, clean spacing)
    let clientY = issuedToY + 18;
    const clientLineHeight = 13;
    const clientInfoWidth = 280;
    
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    if (clientName) {
      doc.text(clientName, contentStartX, clientY, { width: clientInfoWidth });
      clientY += clientLineHeight;
    }
    if (clientEmail) {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(clientEmail, contentStartX, clientY, { width: clientInfoWidth });
      clientY += clientLineHeight;
    }
    if (clientAddress) {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(clientAddress, contentStartX, clientY, { width: clientInfoWidth, lineGap: 1 });
      const addressHeight = doc.heightOfString(clientAddress, { width: clientInfoWidth });
      clientY += Math.max(clientLineHeight, addressHeight);
    }

    // ===================== ITEMS TABLE =====================
    const itemsRaw = input.meta?.lineItems;
    const items: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }> =
      Array.isArray(itemsRaw) ? itemsRaw : [];

    const tableTop = Math.max(issuedToY + 80, clientY + 25);
    const tableWidth = contentWidth; // 100% of container
    const tablePadding = 16; // Right padding so numbers never touch edge
    const rowHeight = 24; // Comfortable row spacing
    
    // Column widths: FIXED FLEX RATIOS (3:1:0.5:1)
    // Total flex = 5.5, so each flex unit = contentWidth / 5.5
    const flexUnit = tableWidth / 5.5;
    const descWidth = flexUnit * 3; // DESCRIPTION (flex: 3)
    const unitWidth = flexUnit * 1; // UNIT PRICE (flex: 1)
    const qtyWidth = flexUnit * 0.5; // QTY (flex: 0.5)
    const totalWidth = flexUnit * 1; // TOTAL (flex: 1)
    
    // Column positions
    const col = {
      desc: { x: contentStartX, w: descWidth },
      unit: { x: contentStartX + descWidth, w: unitWidth },
      qty: { x: contentStartX + descWidth + unitWidth, w: qtyWidth },
      total: { x: contentStartX + descWidth + unitWidth + qtyWidth, w: totalWidth },
    };
    
    // Thin top border
    doc.moveTo(contentStartX, tableTop).lineTo(contentStartX + tableWidth, tableTop).lineWidth(0.5).strokeColor('#D1D5DB').stroke();
    
    // Table header
    const tableHeaderY = tableTop + 6;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
    doc.text('DESCRIPTION', col.desc.x, tableHeaderY, { width: col.desc.w });
    doc.text('UNIT PRICE', col.unit.x, tableHeaderY, { width: col.unit.w, align: 'right' });
    doc.text('QTY', col.qty.x, tableHeaderY, { width: col.qty.w, align: 'center' });
    doc.text('TOTAL', col.total.x, tableHeaderY, { width: col.total.w - tablePadding, align: 'right' });
    
    // Thin header bottom border
    const headerBottomY = tableTop + 20;
    doc.moveTo(contentStartX, headerBottomY).lineTo(contentStartX + tableWidth, headerBottomY).lineWidth(0.5).strokeColor('#D1D5DB').stroke();

    const money = (n: number) =>
      Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

    // Table rows (no vertical borders, comfortable spacing)
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    let y = headerBottomY + 12;

    items.forEach((item) => {
      const descText = item.description || '—';
      
      doc.text(descText, col.desc.x, y, { width: col.desc.w });
      doc.text(money(item.unitPrice ?? 0), col.unit.x, y, { width: col.unit.w, align: 'right' });
      doc.text(String(item.quantity ?? 0), col.qty.x, y, { width: col.qty.w, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
      // Total with right padding
      doc.text(money(item.lineTotal ?? 0), col.total.x, y, { width: col.total.w - tablePadding, align: 'right' });
      doc.font('Helvetica').fontSize(10).fillColor('#374151'); // Reset for next row

      y += rowHeight;

      // Page break for large invoices
      if (y > pageHeight - 200) {
        doc.addPage();
        y = 80;
      }
    });

    // Thin bottom border
    const tableBottomY = y + 8;
    doc.moveTo(contentStartX, tableBottomY).lineTo(contentStartX + tableWidth, tableBottomY).lineWidth(0.5).strokeColor('#D1D5DB').stroke();

    // ===================== TOTALS BLOCK =====================
    const subtotal =
      typeof input.meta?.subtotal === 'number' ? input.meta.subtotal : items.reduce((sum, i) => sum + (Number(i.lineTotal) || 0), 0);
    const tax = Number(input.meta?.tax) || 0;
    const discount = Number(input.meta?.discount) || 0;
    const grandTotal = Number.isFinite(input.amount) ? input.amount : subtotal + tax - discount;

    // Totals block: Fixed width, right-aligned within container
    let totalsY = tableBottomY + 25;
    const totalsBlockWidth = 160; // Fixed width block
    const totalsX = contentStartX + contentWidth - totalsBlockWidth; // Right-aligned
    const totalsLabelW = 80;
    const totalsValueW = 80;
    const totalsRowHeight = 16;

    // Subtotal
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    doc.text('Subtotal', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
    doc.text(money(subtotal), totalsX + totalsLabelW, totalsY, { width: totalsValueW - tablePadding, align: 'right' });
    totalsY += totalsRowHeight;

    // Tax (optional)
    if (tax > 0) {
      doc.text('Tax', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
      doc.text(money(tax), totalsX + totalsLabelW, totalsY, { width: totalsValueW - tablePadding, align: 'right' });
      totalsY += totalsRowHeight;
    }

    // TOTAL (bold and larger)
    totalsY += 4; // Extra spacing before total
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827');
    doc.text('TOTAL', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
    doc.text(money(grandTotal), totalsX + totalsLabelW, totalsY, { width: totalsValueW - tablePadding, align: 'right' });
    
    // Partial payment info (if applicable)
    const amountPaid = input.amountPaid || 0;
    if (amountPaid > 0) {
      const remaining = grandTotal - amountPaid;
      totalsY += totalsRowHeight + 8;
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280');
      doc.text('Amount Paid', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151');
      doc.text(money(amountPaid), totalsX + totalsLabelW, totalsY, { width: totalsValueW - tablePadding, align: 'right' });
      totalsY += totalsRowHeight;
      doc.font('Helvetica').fontSize(9).fillColor('#DC2626');
      doc.text('Remaining', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#DC2626');
      doc.text(money(remaining), totalsX + totalsLabelW, totalsY, { width: totalsValueW - tablePadding, align: 'right' });
    }

    // ===================== NOTE SECTION =====================
    // Appears only if note exists, left-aligned
    const note = (input.meta?.note as string) || '';
    if (note) {
      totalsY += 25;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
      doc.text('Note', contentStartX, totalsY);
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280');
      doc.text(note, contentStartX, totalsY + 14, { width: contentWidth, lineGap: 4 });
    }

    // ===================== FOOTER (TWO-COLUMN) =====================
    const footerY = pageHeight - bottomMargin - 30;
    const footerLeftX = contentStartX;
    const footerRightX = contentStartX + contentWidth - 140;
    
    // LEFT: "Thank you for your business!"
    doc.font('Helvetica').fontSize(9).fillColor('#6B7280');
    doc.text('Thank you for your business!', footerLeftX, footerY, { width: 200 });
    
    // RIGHT: Horizontal line + "Authorized Signed"
    const signatureLineY = footerY;
    doc.moveTo(footerRightX, signatureLineY).lineTo(footerRightX + 120, signatureLineY).lineWidth(0.5).strokeColor('#D1D5DB').stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF');
    doc.text('Authorized Signed', footerRightX, signatureLineY + 6, { width: 120, align: 'center' });

    doc.end();
  }

  private async generateInvoicePdfToBuffer(input: {
    number: string;
    issuedAt: Date;
    dueDate: Date | null;
    currency: string;
    amount: number;
    amountPaid?: number;
    meta: Record<string, unknown>;
  }): Promise<Buffer> {
    // Get company profile first (async)
    const companyProfile = await this.getCompanyProfile();
    const enrichedMeta: Record<string, unknown> = {
      ...input.meta,
      companyName: input.meta?.companyName || companyProfile.name,
      companyAddress: input.meta?.companyAddress || companyProfile.address,
      companyEmail: input.meta?.companyEmail || companyProfile.email,
      companyPhone: input.meta?.companyPhone || companyProfile.phone,
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];
        const w = new Writable({
          write(chunk: Buffer | string, _enc, cb) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            cb();
          },
          final(cb) {
            resolve(Buffer.concat(chunks));
            cb();
          },
        });
        w.on('error', (err) => {
          console.error('Writable stream error:', err);
          reject(err);
        });
        doc.on('error', (err) => {
          console.error('PDFDocument error:', err);
          reject(err);
        });
        doc.pipe(w);

        const candidateLogoPaths = [
          join(process.cwd(), 'apps', 'web', 'public', 'infinity-logo.png'),
          join(process.cwd(), 'apps', 'portal', 'public', 'infinity-logo.png'),
        ];
        const logoPath: string | null =
          (typeof enrichedMeta.logoPath === 'string' ? enrichedMeta.logoPath : null) ||
          candidateLogoPaths.find((p) => existsSync(p)) ||
          null;

        this.drawInvoiceContent(doc, { ...input, meta: enrichedMeta, logoPath });
      } catch (error: any) {
        console.error('Error in generateInvoicePdfToBuffer:', error);
        reject(error);
      }
    });
  }

  async updateInvoice(id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice> {
    // Get current invoice to calculate status
    const current = await this.prisma.invoice.findUnique({ where: { id } });
    if (!current) throw new Error('Invoice not found');

    const updateData: Prisma.InvoiceUpdateInput = { ...data };

    // Auto-determine status based on amountPaid if it's being updated
    if (data.amountPaid !== undefined) {
      const amountPaid = typeof data.amountPaid === 'number' ? data.amountPaid : Number(data.amountPaid) || 0;
      const amount = current.amount;

      if (amountPaid >= amount && amount > 0) {
        updateData.status = 'PAID';
        if (!current.paidAt) {
          updateData.paidAt = new Date();
        }
      } else if (amountPaid > 0 && amountPaid < amount) {
        updateData.status = 'PARTIALLY_PAID';
      } else if (amountPaid === 0 && current.status === 'PAID') {
        // If amountPaid is set to 0 and it was PAID, revert to previous status or SENT
        updateData.status = 'SENT';
        updateData.paidAt = null;
      }
    }

    // Handle new fields (companyEmail, companyPhone, note)
    // These can be null to clear them
    if ('companyEmail' in data) {
      updateData.companyEmail = data.companyEmail;
    }
    if ('companyPhone' in data) {
      updateData.companyPhone = data.companyPhone;
    }
    if ('note' in data) {
      updateData.note = data.note;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id } });
  }

  // Budget Categories
  async getBudgetCategories(companyId?: string) {
    return this.prisma.budgetCategory.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        budgets: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  async getBudgetCategory(id: string) {
    return this.prisma.budgetCategory.findUnique({
      where: { id },
      include: {
        budgets: true,
      },
    });
  }

  async createBudgetCategory(data: Prisma.BudgetCategoryCreateInput) {
    return this.prisma.budgetCategory.create({ data });
  }

  async updateBudgetCategory(id: string, data: Prisma.BudgetCategoryUpdateInput) {
    return this.prisma.budgetCategory.update({
      where: { id },
      data,
    });
  }

  async deleteBudgetCategory(id: string): Promise<void> {
    await this.prisma.budgetCategory.delete({ where: { id } });
  }

  // Budget Entries
  async getBudgetEntries(companyId?: string, categoryId?: string, periodStart?: Date, periodEnd?: Date) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (categoryId) where.categoryId = categoryId;
    if (periodStart || periodEnd) {
      where.AND = [];
      if (periodStart) where.AND.push({ periodStart: { gte: periodStart } });
      if (periodEnd) where.AND.push({ periodEnd: { lte: periodEnd } });
    }

    return this.prisma.budgetEntry.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        category: true,
        company: true,
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async getBudgetEntry(id: string) {
    return this.prisma.budgetEntry.findUnique({
      where: { id },
      include: {
        category: true,
        company: true,
      },
    });
  }

  async createBudgetEntry(data: Prisma.BudgetEntryCreateInput) {
    return this.prisma.budgetEntry.create({ data });
  }

  async updateBudgetEntry(id: string, data: Prisma.BudgetEntryUpdateInput) {
    return this.prisma.budgetEntry.update({
      where: { id },
      data,
    });
  }

  async deleteBudgetEntry(id: string): Promise<void> {
    await this.prisma.budgetEntry.delete({ where: { id } });
  }

  // Cash Flow Entries
  async getCashFlowEntries(companyId?: string, type?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.cashFlowEntry.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        relatedInvoice: {
          include: {
            member: true,
          },
        },
        company: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getCashFlowEntry(id: string) {
    return this.prisma.cashFlowEntry.findUnique({
      where: { id },
      include: {
        relatedInvoice: {
          include: {
            member: true,
          },
        },
        company: true,
      },
    });
  }

  async createCashFlowEntry(data: Prisma.CashFlowEntryCreateInput) {
    return this.prisma.cashFlowEntry.create({ data });
  }

  async updateCashFlowEntry(id: string, data: Prisma.CashFlowEntryUpdateInput) {
    return this.prisma.cashFlowEntry.update({
      where: { id },
      data,
    });
  }

  async deleteCashFlowEntry(id: string): Promise<void> {
    await this.prisma.cashFlowEntry.delete({ where: { id } });
  }

  // Petty Cash Transactions
  async getPettyCashTransactions(companyId?: string, type?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.pettyCashTransaction.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        company: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getPettyCashTransaction(id: string) {
    return this.prisma.pettyCashTransaction.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });
  }

  async createPettyCashTransaction(data: Prisma.PettyCashTransactionCreateInput) {
    // Extract companyId from the data
    let companyId: string;
    if (typeof data.company === 'object' && data.company !== null) {
      if ('connect' in data.company && data.company.connect && typeof data.company.connect === 'object' && 'id' in data.company.connect) {
        companyId = data.company.connect.id as string;
      } else {
        throw new Error('Invalid company connection');
      }
    } else {
      throw new Error('Company is required');
    }

    // Calculate balanceAfter based on previous transactions
    const previous = await this.prisma.pettyCashTransaction.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    const previousBalance = previous?.balanceAfter || 0;
    const amount = data.amount || 0;
    const balanceAfter = data.type === 'REPLENISH' 
      ? previousBalance + amount 
      : previousBalance - amount;

    return this.prisma.pettyCashTransaction.create({
      data: {
        ...data,
        balanceAfter,
      },
    });
  }

  async updatePettyCashTransaction(id: string, data: Prisma.PettyCashTransactionUpdateInput) {
    return this.prisma.pettyCashTransaction.update({
      where: { id },
      data,
    });
  }

  async deletePettyCashTransaction(id: string): Promise<void> {
    await this.prisma.pettyCashTransaction.delete({ where: { id } });
  }

  // Coaches
  async getCoaches(companyId?: string): Promise<Coach[]> {
    return this.prisma.coach.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        classes: true,
        bookings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCoach(id: string): Promise<Coach | null> {
    return this.prisma.coach.findUnique({
      where: { id },
      include: {
        company: true,
        classes: true,
        bookings: true,
      },
    });
  }

  async createCoach(data: Prisma.CoachCreateInput): Promise<Coach> {
    return this.prisma.coach.create({ data });
  }

  async updateCoach(id: string, data: Prisma.CoachUpdateInput): Promise<Coach> {
    return this.prisma.coach.update({
      where: { id },
      data,
    });
  }

  async deleteCoach(id: string): Promise<void> {
    await this.prisma.coach.delete({ where: { id } });
  }

  // Classes
  async getClasses(companyId?: string, coachId?: string): Promise<Class[]> {
    return this.prisma.class.findMany({
      where: {
        companyId: companyId || undefined,
        coachId: coachId || undefined,
      },
      include: {
        company: true,
        coach: true,
        enrollments: {
          include: { member: true },
        },
        bookings: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getClass(id: string): Promise<Class | null> {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        company: true,
        coach: true,
        enrollments: {
          include: { member: true },
        },
        bookings: true,
      },
    });
  }

  async createClass(data: Prisma.ClassCreateInput): Promise<Class> {
    return this.prisma.class.create({ data });
  }

  async updateClass(id: string, data: Prisma.ClassUpdateInput): Promise<Class> {
    return this.prisma.class.update({
      where: { id },
      data,
    });
  }

  async deleteClass(id: string): Promise<void> {
    await this.prisma.class.delete({ where: { id } });
  }

  // Class Enrollments
  async getEnrollments(classId?: string, memberId?: string): Promise<ClassEnrollment[]> {
    return this.prisma.classEnrollment.findMany({
      where: {
        classId: classId || undefined,
        memberId: memberId || undefined,
      },
      include: {
        class: true,
        member: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnrollment(id: string): Promise<ClassEnrollment | null> {
    return this.prisma.classEnrollment.findUnique({
      where: { id },
      include: {
        class: true,
        member: true,
      },
    });
  }

  async createEnrollment(data: Prisma.ClassEnrollmentCreateInput): Promise<ClassEnrollment> {
    return this.prisma.classEnrollment.create({ data });
  }

  async deleteEnrollment(id: string): Promise<void> {
    await this.prisma.classEnrollment.delete({ where: { id } });
  }

  // Inventory Items
  async getInventoryItems(companyId?: string, status?: InventoryStatus): Promise<InventoryItem[]> {
    return this.prisma.inventoryItem.findMany({
      where: {
        companyId: companyId || undefined,
        status: status || undefined,
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    return this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });
  }

  async createInventoryItem(data: Prisma.InventoryItemCreateInput): Promise<InventoryItem> {
    return this.prisma.inventoryItem.create({ data });
  }

  async updateInventoryItem(id: string, data: Prisma.InventoryItemUpdateInput): Promise<InventoryItem> {
    return this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await this.prisma.inventoryItem.delete({ where: { id } });
  }

  // Staff Tasks
  async getStaffTasks(companyId?: string, status?: TaskStatus): Promise<StaffTask[]> {
    return this.prisma.staffTask.findMany({
      where: {
        companyId: companyId || undefined,
        status: status || undefined,
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStaffTask(id: string): Promise<StaffTask | null> {
    return this.prisma.staffTask.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });
  }

  async createStaffTask(data: Prisma.StaffTaskCreateInput): Promise<StaffTask> {
    return this.prisma.staffTask.create({ data });
  }

  async updateStaffTask(id: string, data: Prisma.StaffTaskUpdateInput): Promise<StaffTask> {
    return this.prisma.staffTask.update({
      where: { id },
      data,
    });
  }

  async deleteStaffTask(id: string): Promise<void> {
    await this.prisma.staffTask.delete({ where: { id } });
  }

  // Company Settings
  async getCompanySettings(companyId: string): Promise<CompanySettings | null> {
    return this.prisma.companySettings.findUnique({
      where: { companyId },
      include: {
        company: true,
      },
    });
  }

  async createCompanySettings(data: Prisma.CompanySettingsCreateInput): Promise<CompanySettings> {
    return this.prisma.companySettings.create({ data });
  }

  async updateCompanySettings(companyId: string, data: Prisma.CompanySettingsUpdateInput): Promise<CompanySettings> {
    return this.prisma.companySettings.upsert({
      where: { companyId },
      update: data,
      create: {
        ...data,
        company: {
          connect: { id: companyId },
        },
      } as Prisma.CompanySettingsCreateInput,
    });
  }

  // Dashboard Stats
  async getDashboardStats(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const [totalMembers, activeCoaches, activeClasses, activeSubscriptions, pendingBookings, pendingInvoices, openTasks, lowInventory] = await Promise.all([
      this.prisma.member.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.coach.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.class.count({ where: { ...where, status: 'SCHEDULED' } }),
      this.prisma.subscription.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.booking.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.invoice.count({ where: { ...where, status: { in: ['DRAFT', 'SENT', 'OVERDUE'] } } }),
      this.prisma.staffTask.count({ where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.inventoryItem.count({ where: { ...where, status: { in: ['LOW', 'OUT_OF_STOCK'] } } }),
    ]);

    return {
      totalMembers,
      activeCoaches,
      activeClasses,
      activeSubscriptions,
      pendingBookings,
      pendingInvoices,
      openTasks,
      lowInventory,
    };
  }

  // Package Registrations (public sign-ups for Basketball, Gymnastics, Volleyball, etc.)
  // 30-day period from registration; freeze pauses the countdown.
  async getPackageRegistrations(
    packageName?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Array<{
    id: string;
    packageName: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    customerAge: number | null;
    isPaid: boolean;
    periodEndsAt: Date | null;
    isFrozen: boolean;
    frozenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const where: any = {};
    
    if (packageName) {
      where.packageName = packageName;
    }

    // Add date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        where.createdAt.lte = end;
      }
    }

    const rows = await (this.prisma as any).packageRegistration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      packageName: r.packageName,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail ?? null,
      customerAge: r.customerAge ?? null,
      isPaid: r.isPaid,
      periodEndsAt: r.periodEndsAt ?? null,
      isFrozen: r.isFrozen ?? false,
      frozenAt: r.frozenAt ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createPackageRegistration(data: {
    packageName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerAge?: number | null;
  }): Promise<{ id: string; packageName: string; customerName: string; customerPhone: string; customerEmail: string | null; customerAge: number | null; isPaid: boolean; periodEndsAt: Date | null; isFrozen: boolean; frozenAt: Date | null; createdAt: Date }> {
    const now = new Date();
    const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
    const row = await (this.prisma as any).packageRegistration.create({
      data: {
        packageName: data.packageName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail ?? null,
        customerAge: data.customerAge ?? null,
        periodEndsAt,
      },
    });
    return {
      id: row.id,
      packageName: row.packageName,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail ?? null,
      customerAge: row.customerAge ?? null,
      isPaid: row.isPaid,
      periodEndsAt: row.periodEndsAt ?? null,
      isFrozen: row.isFrozen ?? false,
      frozenAt: row.frozenAt ?? null,
      createdAt: row.createdAt,
    };
  }

  async updatePackageRegistration(
    id: string,
    data: { isPaid?: boolean; isFrozen?: boolean },
  ): Promise<{ id: string; packageName: string; customerName: string; customerPhone: string; customerEmail: string | null; customerAge: number | null; isPaid: boolean; periodEndsAt: Date | null; isFrozen: boolean; frozenAt: Date | null; updatedAt: Date }> {
    const existing = await (this.prisma as any).packageRegistration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Package registration not found');

    const updateData: any = {};
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;

    if (data.isFrozen !== undefined) {
      updateData.isFrozen = data.isFrozen;
      if (data.isFrozen === true) {
        updateData.frozenAt = new Date();
      } else {
        // Unfreeze: extend periodEndsAt by the time spent frozen
        const frozenAt = (existing as any).frozenAt;
        if (frozenAt) {
          const now = new Date();
          const frozenMs = now.getTime() - new Date(frozenAt).getTime();
          const currentEnd = (existing as any).periodEndsAt ? new Date((existing as any).periodEndsAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          updateData.periodEndsAt = new Date(currentEnd.getTime() + frozenMs);
        }
        updateData.frozenAt = null;
      }
    }

    const row = await (this.prisma as any).packageRegistration.update({
      where: { id },
      data: updateData,
    });
    return {
      id: row.id,
      packageName: row.packageName,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail ?? null,
      customerAge: row.customerAge ?? null,
      isPaid: row.isPaid,
      periodEndsAt: row.periodEndsAt ?? null,
      isFrozen: row.isFrozen ?? false,
      frozenAt: row.frozenAt ?? null,
      updatedAt: row.updatedAt,
    };
  }

  async deletePackageRegistration(id: string): Promise<void> {
    await (this.prisma as any).packageRegistration.delete({ where: { id } });
  }
}

