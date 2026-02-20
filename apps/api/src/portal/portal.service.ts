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

  async getBookingDefaults(): Promise<{ companyId: string }> {
    const company = await this.prisma.company.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!company) {
      throw new NotFoundException('No company found. Create a company in the admin first.');
    }
    return { companyId: company.id };
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
    try {
      await this.prisma.booking.delete({ where: { id } });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2025') {
        throw new NotFoundException('Booking not found. It may have been already deleted.');
      }
      throw error;
    }
  }

  // Blocked slots (static booking blocks; isBlocked=false makes the slot free for public booking).
  // If startDate/endDate provided, only return slots active in that range (slot.startDate <= endDate and slot.endDate >= startDate, or no dates set).
  async getBlockedSlots(startDate?: string, endDate?: string): Promise<{ id: string; dayOfWeek: string; courtType: string; time: string; isBlocked: boolean; label: string | null; startDate: string | null; endDate: string | null }[]> {
    try {
      const where: any = {};
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        where.AND = [
          { OR: [{ startDate: null }, { startDate: { lte: end } }] },
          { OR: [{ endDate: null }, { endDate: { gte: start } }] },
        ];
      }
      const rows = await (this.prisma as any).blockedSlot.findMany({
        where,
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
    // NOTE: `description` stores JSON meta for PDF rendering and future editing.
    const meta = {
      v: 2,
      companyName: (d.companyName && String(d.companyName)) || companyProfile.name,
      companyAddress: (d.companyAddress && String(d.companyAddress)) || companyProfile.address,
      companyEmail: (d.companyEmail && String(d.companyEmail)) || companyProfile.email,
      companyPhone: (d.companyPhone && String(d.companyPhone)) || companyProfile.phone,
      clientName: (d.clientName && String(d.clientName)) || '',
      clientEmail: (d.clientEmail && String(d.clientEmail)) || '',
      clientAddress: (d.clientAddress && String(d.clientAddress)) || '',
      currency: (d.currency && String(d.currency)) || 'JOD',
      paymentMethod,
      // Academy-specific fields
      student: {
        fullName: (d.studentFullName && String(d.studentFullName)) || '',
        age:
          typeof d.studentAge === 'number'
            ? d.studentAge
            : d.studentAge != null && String(d.studentAge).trim()
              ? Number(d.studentAge)
              : null,
        guardianName: (d.guardianName && String(d.guardianName)) || '',
        emergencyPhone: (d.emergencyPhone && String(d.emergencyPhone)) || '',
        membershipId: (d.membershipId && String(d.membershipId)) || null,
      },
      program: {
        name: (d.programName && String(d.programName)) || '',
        coachName: (d.coachName && String(d.coachName)) || '',
        branch: (d.branch && String(d.branch)) || '',
        trainingPeriodStart: d.trainingPeriodStart ? String(d.trainingPeriodStart) : null,
        trainingPeriodEnd: d.trainingPeriodEnd ? String(d.trainingPeriodEnd) : null,
        sessionsPerWeek:
          typeof d.sessionsPerWeek === 'number'
            ? d.sessionsPerWeek
            : d.sessionsPerWeek != null && String(d.sessionsPerWeek).trim()
              ? Number(d.sessionsPerWeek)
              : null,
        totalSessions:
          typeof d.totalSessions === 'number'
            ? d.totalSessions
            : d.totalSessions != null && String(d.totalSessions).trim()
              ? Number(d.totalSessions)
              : null,
      },
      paymentDetails: {
        bankName: (d.bankName && String(d.bankName)) || null,
        accountName: (d.accountName && String(d.accountName)) || null,
        iban: (d.iban && String(d.iban)) || null,
        swift: (d.swift && String(d.swift)) || null,
        cashAccepted: typeof d.cashAccepted === 'boolean' ? d.cashAccepted : true,
      },
      installments: Array.isArray(d.installments) ? d.installments : null,
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

    // ===================== ACADEMY DETAILS (STUDENT + PROGRAM) =====================
    const detailsStartY = Math.max(issuedToY + 80, clientY + 25);
    const student = ((input.meta as any)?.student ?? {}) as Record<string, any>;
    const program = ((input.meta as any)?.program ?? {}) as Record<string, any>;
    const hasDetails =
      Boolean(student?.fullName) ||
      student?.age != null ||
      Boolean(student?.guardianName) ||
      Boolean(student?.emergencyPhone) ||
      Boolean(student?.membershipId) ||
      Boolean(program?.name) ||
      Boolean(program?.coachName) ||
      Boolean(program?.branch) ||
      Boolean(program?.trainingPeriodStart) ||
      Boolean(program?.trainingPeriodEnd) ||
      program?.sessionsPerWeek != null ||
      program?.totalSessions != null;

    let tableTop = detailsStartY;
    if (hasDetails) {
      const gap = 18;
      const colGap = 18;
      const colW = Math.floor((contentWidth - colGap) / 2);
      const leftX = contentStartX;
      const rightX = contentStartX + colW + colGap;

      const studentLines: string[] = [];
      if (student?.fullName) studentLines.push(`Name: ${String(student.fullName)}`);
      if (student?.age != null && !Number.isNaN(Number(student.age))) studentLines.push(`Age: ${Number(student.age)}`);
      if (student?.guardianName) studentLines.push(`Guardian: ${String(student.guardianName)}`);
      if (student?.emergencyPhone) studentLines.push(`Emergency: ${String(student.emergencyPhone)}`);
      if (student?.membershipId) studentLines.push(`Membership ID: ${String(student.membershipId)}`);

      const programLines: string[] = [];
      if (program?.name) programLines.push(`Program: ${String(program.name)}`);
      if (program?.coachName) programLines.push(`Coach: ${String(program.coachName)}`);
      if (program?.branch) programLines.push(`Branch: ${String(program.branch)}`);
      if (program?.trainingPeriodStart || program?.trainingPeriodEnd) {
        const start = program?.trainingPeriodStart ? new Date(String(program.trainingPeriodStart)) : null;
        const end = program?.trainingPeriodEnd ? new Date(String(program.trainingPeriodEnd)) : null;
        const s = start && !Number.isNaN(start.getTime()) ? start.toLocaleDateString() : '—';
        const e = end && !Number.isNaN(end.getTime()) ? end.toLocaleDateString() : '—';
        programLines.push(`Period: ${s} – ${e}`);
      }
      if (program?.sessionsPerWeek != null && !Number.isNaN(Number(program.sessionsPerWeek))) {
        programLines.push(`Sessions/week: ${Number(program.sessionsPerWeek)}`);
      }
      if (program?.totalSessions != null && !Number.isNaN(Number(program.totalSessions))) {
        programLines.push(`Total sessions: ${Number(program.totalSessions)}`);
      }

      // Section labels
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
      doc.text('STUDENT', leftX, detailsStartY, { width: colW });
      doc.text('PROGRAM', rightX, detailsStartY, { width: colW });

      const bodyY = detailsStartY + 14;
      const lineH = 12;
      doc.font('Helvetica').fontSize(9).fillColor('#374151');
      studentLines.forEach((line, i) => doc.text(line, leftX, bodyY + i * lineH, { width: colW }));
      programLines.forEach((line, i) => doc.text(line, rightX, bodyY + i * lineH, { width: colW }));

      const maxLines = Math.max(studentLines.length, programLines.length, 1);
      const blockH = 14 + maxLines * lineH;

      // Divider under details
      const detailsBottom = detailsStartY + blockH + 10;
      doc.moveTo(contentStartX, detailsBottom).lineTo(contentStartX + contentWidth, detailsBottom).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
      tableTop = detailsBottom + gap;
    }

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
      const noteHeight = doc.heightOfString(note, { width: contentWidth, lineGap: 4 });
      totalsY = totalsY + 14 + noteHeight;
    }

    // ===================== PAYMENT DETAILS (BANK/CASH + INSTALLMENTS) =====================
    const paymentDetails = ((input.meta as any)?.paymentDetails ?? {}) as Record<string, any>;
    const installmentsRaw = (input.meta as any)?.installments;
    const installments: Array<{ dueDate?: string; amount?: number; method?: string; isPaid?: boolean }> = Array.isArray(installmentsRaw)
      ? installmentsRaw
      : [];

    const hasPaymentDetails =
      Boolean(paymentDetails?.bankName) ||
      Boolean(paymentDetails?.accountName) ||
      Boolean(paymentDetails?.iban) ||
      Boolean(paymentDetails?.swift) ||
      typeof paymentDetails?.cashAccepted === 'boolean';

    if (hasPaymentDetails || installments.length > 0) {
      let infoY = totalsY + 22;

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
      doc.text('Payment details', contentStartX, infoY);
      infoY += 14;

      doc.font('Helvetica').fontSize(9).fillColor('#6B7280');

      const lines: string[] = [];
      if (paymentDetails?.bankName) lines.push(`Bank: ${String(paymentDetails.bankName)}`);
      if (paymentDetails?.accountName) lines.push(`Account name: ${String(paymentDetails.accountName)}`);
      if (paymentDetails?.iban) lines.push(`IBAN: ${String(paymentDetails.iban)}`);
      if (paymentDetails?.swift) lines.push(`SWIFT: ${String(paymentDetails.swift)}`);
      if (typeof paymentDetails?.cashAccepted === 'boolean') lines.push(`Cash accepted: ${paymentDetails.cashAccepted ? 'Yes' : 'No'}`);

      lines.forEach((line, i) => {
        doc.text(line, contentStartX, infoY + i * 12, { width: contentWidth });
      });
      infoY += Math.max(lines.length, 1) * 12 + 10;

      if (installments.length > 0) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
        doc.text('Installments', contentStartX, infoY);
        infoY += 12;

        doc.font('Helvetica').fontSize(9).fillColor('#374151');
        installments.slice(0, 6).forEach((ins) => {
          const due = ins.dueDate ? new Date(String(ins.dueDate)) : null;
          const dueText = due && !Number.isNaN(due.getTime()) ? due.toLocaleDateString() : '—';
          const amountText = Number.isFinite(Number(ins.amount)) ? money(Number(ins.amount)) : '0.00';
          const methodText = ins.method ? String(ins.method) : '—';
          const paidText = ins.isPaid ? 'Paid' : 'Unpaid';
          doc.text(`${dueText} • ${amountText} • ${methodText} • ${paidText}`, contentStartX, infoY, { width: contentWidth });
          infoY += 12;
        });
        if (installments.length > 6) {
          doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF');
          doc.text(`+ ${installments.length - 6} more installment(s)`, contentStartX, infoY, { width: contentWidth });
          infoY += 10;
        }
      }

      totalsY = infoY;
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

  async getPackagePricing(): Promise<Array<{ packageName: string; basePriceJod: number | null }>> {
    const rows = await (this.prisma as any).packagePricing.findMany({ orderBy: { packageName: 'asc' } });
    return rows.map((r: any) => ({ packageName: r.packageName, basePriceJod: r.basePriceJod ?? null }));
  }

  // Package Registrations: pricing + discounts (manual only). finalPriceJod = base - discount, clamp >= 0.
  private computeFinalPriceJod(
    basePriceJod: number,
    discountType: string,
    discountValue: number | null | undefined,
  ): number {
    const base = Math.max(0, basePriceJod);
    if (!discountType || discountType === 'NONE' || discountValue == null) return base;
    if (discountType === 'PERCENT') return Math.max(0, base - Math.round((base * Number(discountValue)) / 100));
    if (discountType === 'AMOUNT') return Math.max(0, base - Number(discountValue));
    return base;
  }

  /** Active packages for portal (registration form, default price). Uses Package table when available. */
  async getPackages(): Promise<Array<{ id: string; sportType: string; name: string; description: string | null; sessionsCount: number; trackingType: string; pricingType: string; currentPriceJod: number | null; isActive: boolean; sortOrder: number }>> {
    try {
      const rows = await (this.prisma as any).package.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, sportType: true, name: true, description: true, sessionsCount: true, trackingType: true, pricingType: true, currentPriceJod: true, isActive: true, sortOrder: true },
      });
      return rows;
    } catch {
      return [];
    }
  }

  async getPackageRegistrations(
    packageName?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    pageSize?: number,
  ): Promise<
    | Array<{
        id: string;
        packageName: string;
        customerName: string;
        customerPhone: string;
        customerEmail: string | null;
        customerAge: number | null;
        isPaid: boolean;
        basePriceJod: number;
        discountType: string;
        discountValue: number | null;
        discountReason: string | null;
        finalPriceJod: number;
        periodEndsAt: Date | null;
        isFrozen: boolean;
        frozenAt: Date | null;
        sessionsBonus: number;
        createdAt: Date;
        updatedAt: Date;
      }>
    | { rows: any[]; total: number; page: number; pageSize: number }
  > {
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

    const usePagination = page != null && pageSize != null && pageSize > 0;
    const skip = usePagination ? Math.max(0, (Math.max(1, page) - 1) * pageSize) : undefined;
    const take = usePagination ? Math.min(500, Math.max(1, pageSize)) : undefined;

    const includeReceipts = { receipts: { where: { status: 'ACTIVE' as const } } };

    const [rows, total] = usePagination
      ? await Promise.all([
          this.prisma.packageRegistration.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take,
            include: includeReceipts,
          }),
          this.prisma.packageRegistration.count({ where }),
        ])
      : [
          await this.prisma.packageRegistration.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: includeReceipts,
          }),
          0,
        ];

    const mapRow = (r: any) => {
      const collected = (r.receipts || []).reduce((s: number, rec: any) => s + (rec.amountPaid || 0), 0);
      return {
        id: r.id,
        packageName: r.packageName,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        customerEmail: r.customerEmail ?? null,
        customerAge: r.customerAge ?? null,
        isPaid: r.isPaid,
        basePriceJod: Number(r.basePriceJod) ?? 0,
        discountType: r.discountType ?? 'NONE',
        discountValue: r.discountValue ?? null,
        discountReason: r.discountReason ?? null,
        finalPriceJod: Number(r.finalPriceJod) ?? 0,
        collected,
        periodEndsAt: r.periodEndsAt ?? null,
        isFrozen: r.isFrozen ?? false,
        frozenAt: r.frozenAt ?? null,
        sessionsBonus: r.sessionsBonus ?? 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    };

    if (usePagination) {
      return { rows: rows.map(mapRow), total, page: Math.max(1, page!), pageSize: take! };
    }
    return rows.map(mapRow);
  }

  /** Billing period key (YYYY-MM) and optional end-of-month for price locking. */
  private billingPeriodFromDate(d: Date): { billingPeriodKey: string; priceLockedUntil: Date } {
    const y = d.getFullYear();
    const m = d.getMonth();
    const billingPeriodKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const priceLockedUntil = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { billingPeriodKey, priceLockedUntil };
  }

  async createPackageRegistration(data: {
    packageName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerAge?: number | null;
    basePriceJod?: number;
    discountType?: string;
    discountValue?: number | null;
    discountReason?: string | null;
    createdBy?: string | null;
  }) {
    const pkg = (data.packageName || '').trim();
    let basePriceJod = data.basePriceJod;
    if (basePriceJod == null) {
      const pricing = await (this.prisma as any).packagePricing.findUnique({ where: { packageName: pkg } }).catch(() => null);
      basePriceJod = pricing?.basePriceJod ?? 0;
    }
    basePriceJod = Math.max(0, Number(basePriceJod) || 0);
    const discountType = (data.discountType || 'NONE').toUpperCase();
    const discountValue = discountType === 'NONE' ? null : (data.discountValue ?? 0);
    if (discountType !== 'NONE' && (discountValue == null || (discountType === 'PERCENT' && (discountValue < 0 || discountValue > 100)) || (discountType === 'AMOUNT' && discountValue < 0)))
      throw new BadRequestException('Invalid discount');
    if (discountType !== 'NONE' && !(data.discountReason || '').trim())
      throw new BadRequestException('Discount reason is required when applying a discount');
    const finalPriceJod = this.computeFinalPriceJod(basePriceJod, discountType, discountValue);
    const now = new Date();
    const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { billingPeriodKey, priceLockedUntil } = this.billingPeriodFromDate(now);
    const discountApplied = discountType !== 'NONE';

    // Production safety: some deployments may have an older DB schema (missing newer columns).
    // Avoid selecting/writing optional newer fields so the public registration endpoint stays available.
    let row: {
      id: string;
      packageName: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string | null;
      customerAge: number | null;
      isPaid: boolean;
      basePriceJod: number;
      discountType: string;
      discountValue: number | null;
      discountReason: string | null;
      finalPriceJod: number;
      createdAt: Date;
    };

    try {
      row = await (this.prisma as any).packageRegistration.create({
        data: {
          packageName: pkg,
          customerName: (data.customerName || '').trim(),
          customerPhone: (data.customerPhone || '').trim(),
          customerEmail: (data.customerEmail || '').trim() || null,
          customerAge: data.customerAge ?? null,
          basePriceJod,
          discountType,
          discountValue: discountType === 'NONE' ? null : Number(discountValue),
          discountReason: discountType === 'NONE' ? null : (data.discountReason || '').trim() || null,
          finalPriceJod,
        },
        select: {
          id: true,
          packageName: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          customerAge: true,
          isPaid: true,
          basePriceJod: true,
          discountType: true,
          discountValue: true,
          discountReason: true,
          finalPriceJod: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      // Ensure we ALWAYS see why production fails.
      console.error('[portal] createPackageRegistration failed', {
        message: e?.message,
        code: e?.code,
        meta: e?.meta,
      });
      throw e;
    }

    // Best-effort: try to persist newer fields when supported by the DB schema.
    // If the DB is missing these columns, ignore and continue.
    try {
      await (this.prisma as any).packageRegistration.update({
        where: { id: row.id },
        data: {
          billingPeriodKey,
          priceLockedUntil,
          periodEndsAt,
          discountAppliedBy: discountApplied ? (data.createdBy ?? null) : null,
          discountAppliedAt: discountApplied ? now : null,
        },
      });
    } catch {
      // ignore
    }

    if (discountApplied) {
      await this.auditLog(data.createdBy ?? null, 'DISCOUNT_APPLIED', 'Registration', row.id, {
        discountType,
        discountValue: discountType === 'NONE' ? null : Number(discountValue),
        finalPriceJod,
      });
    }
    return {
      id: row.id,
      packageName: row.packageName,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail ?? null,
      customerAge: row.customerAge ?? null,
      isPaid: row.isPaid,
      basePriceJod: row.basePriceJod,
      discountType: row.discountType,
      discountValue: row.discountValue ?? null,
      discountReason: row.discountReason ?? null,
      finalPriceJod: row.finalPriceJod,
      periodEndsAt,
      isFrozen: false,
      frozenAt: null,
      createdAt: row.createdAt,
    };
  }

  async updatePackageRegistration(
    id: string,
    data: {
      isPaid?: boolean;
      isFrozen?: boolean;
      basePriceJod?: number;
      discountType?: string;
      discountValue?: number | null;
      discountReason?: string | null;
      createdBy?: string | null;
    },
  ) {
    const existing = await (this.prisma as any).packageRegistration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Package registration not found');

    const updateData: any = {};
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;

    if (data.basePriceJod !== undefined || data.discountType !== undefined || data.discountValue !== undefined || data.discountReason !== undefined) {
      const basePriceJod = Math.max(0, Number(data.basePriceJod ?? (existing as any).basePriceJod) ?? 0);
      const discountType = (data.discountType ?? (existing as any).discountType ?? 'NONE').toUpperCase();
      const discountValue = discountType === 'NONE' ? null : (data.discountValue ?? (existing as any).discountValue ?? 0);
      if (discountType !== 'NONE' && !(data.discountReason ?? (existing as any).discountReason ?? '').trim())
        throw new BadRequestException('Discount reason is required when applying a discount');
      updateData.basePriceJod = basePriceJod;
      updateData.discountType = discountType;
      updateData.discountValue = discountType === 'NONE' ? null : Number(discountValue);
      updateData.discountReason = discountType === 'NONE' ? null : (data.discountReason ?? (existing as any).discountReason ?? '').trim() || null;
      updateData.finalPriceJod = this.computeFinalPriceJod(basePriceJod, discountType, discountValue);
      if (discountType !== 'NONE') {
        updateData.discountAppliedBy = data.createdBy ?? null;
        updateData.discountAppliedAt = new Date();
      }
    }

    if (data.isFrozen !== undefined) {
      updateData.isFrozen = data.isFrozen;
      if (data.isFrozen === true) {
        updateData.frozenAt = new Date();
      } else {
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
    if (updateData.discountAppliedAt != null) {
      await this.auditLog(data.createdBy ?? null, 'DISCOUNT_APPLIED', 'Registration', id, {
        discountType: updateData.discountType,
        discountValue: updateData.discountValue ?? null,
        finalPriceJod: updateData.finalPriceJod,
      });
    }
    return {
      id: row.id,
      packageName: row.packageName,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail ?? null,
      customerAge: row.customerAge ?? null,
      isPaid: row.isPaid,
      basePriceJod: row.basePriceJod,
      discountType: row.discountType,
      discountValue: row.discountValue ?? null,
      discountReason: row.discountReason ?? null,
      finalPriceJod: row.finalPriceJod,
      periodEndsAt: row.periodEndsAt ?? null,
      isFrozen: row.isFrozen ?? false,
      frozenAt: row.frozenAt ?? null,
      updatedAt: row.updatedAt,
    };
  }

  async deletePackageRegistration(id: string): Promise<void> {
    await (this.prisma as any).packageRegistration.delete({ where: { id } });
  }

  /** Create a new registration with same person/package/pricing, unpaid and fresh period (re-register). */
  async reregister(id: string) {
    const existing = await (this.prisma as any).packageRegistration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registration not found');
    const now = new Date();
    const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { billingPeriodKey, priceLockedUntil } = this.billingPeriodFromDate(now);
    const row = await (this.prisma as any).packageRegistration.create({
      data: {
        packageName: existing.packageName,
        customerName: existing.customerName,
        customerPhone: existing.customerPhone,
        customerEmail: existing.customerEmail ?? null,
        customerAge: existing.customerAge ?? null,
        isPaid: false,
        basePriceJod: existing.basePriceJod,
        discountType: existing.discountType ?? 'NONE',
        discountValue: existing.discountValue ?? null,
        discountReason: existing.discountReason ?? null,
        finalPriceJod: existing.finalPriceJod,
        billingPeriodKey,
        priceLockedUntil,
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
      basePriceJod: row.basePriceJod,
      discountType: row.discountType,
      discountValue: row.discountValue ?? null,
      discountReason: row.discountReason ?? null,
      finalPriceJod: row.finalPriceJod,
      periodEndsAt: row.periodEndsAt ?? null,
      isFrozen: row.isFrozen ?? false,
      frozenAt: row.frozenAt ?? null,
      sessionsBonus: row.sessionsBonus ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Write audit log entry (fire-and-forget; errors do not fail the main action). */
  private async auditLog(actorUserId: string | null, actionType: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          actorUserId: actorUserId ?? undefined,
          actionType,
          entityType,
          entityId: entityId ?? undefined,
          metadata: metadata ?? undefined,
        },
      });
    } catch {
      // best-effort; do not fail main flow
    }
  }

  // --- User (member account): find or create when registration marked paid; link receipts ---
  /**
   * Find existing user by email or create/activate one from registration.
   * When staff marks a registration as paid, we ensure an account exists and link the receipt to it.
   */
  async findOrCreateUserFromRegistration(reg: {
    customerEmail?: string | null;
    customerName: string;
    customerPhone: string;
  }): Promise<{ id: string } | null> {
    const email = (reg.customerEmail ?? '').trim().toLowerCase();
    if (!email) return null;

    const prisma = this.prisma as any;
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          ...(user.name ? {} : { name: (reg.customerName || '').trim() || null }),
          ...(user.phone ? {} : { phone: (reg.customerPhone || '').trim() || null }),
        },
      });
      return { id: user.id };
    }
    user = await prisma.user.create({
      data: {
        email,
        name: (reg.customerName || '').trim() || null,
        phone: (reg.customerPhone || '').trim() || null,
        role: 'MEMBER',
        isActive: true,
      },
    });
    return { id: user.id };
  }

  // --- Receipts (registration payments; do not touch Invoice system) ---
  private async generateReceiptId(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await (this.prisma as any).receipt.count({ where: { receiptId: { startsWith: `RCP-${year}-` } } });
    const seq = String(count + 1).padStart(4, '0');
    return `RCP-${year}-${seq}`;
  }

  async createReceiptForMarkPaid(
    registrationId: string,
    data: { amountPaid: number; paymentMethod: string; privateNote: string; createdBy?: string },
  ) {
    const reg = await (this.prisma as any).packageRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found');
    if (!data.privateNote?.trim()) throw new BadRequestException('Private note is required');
    const method = (data.paymentMethod || 'CASH').toUpperCase();
    const validMethods = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];
    if (!validMethods.includes(method)) throw new BadRequestException('Invalid payment method');

    const user = await this.findOrCreateUserFromRegistration(reg);
    const receiptId = await this.generateReceiptId();
    const receipt = await (this.prisma as any).receipt.create({
      data: {
        receiptId,
        registrationId,
        userId: user?.id ?? null,
        personName: reg.customerName,
        personPhone: reg.customerPhone,
        packageName: reg.packageName,
        amountPaid: Math.round(data.amountPaid) || 0,
        paymentMethod: method,
        privateNote: data.privateNote.trim(),
        createdBy: data.createdBy ?? null,
        status: 'ACTIVE',
      },
    });
    const collected = await (this.prisma as any).receipt.aggregate({
      where: { registrationId, voidedAt: null },
      _sum: { amountPaid: true },
    });
    const totalCollected = (collected._sum?.amountPaid ?? 0) || 0;
    const finalPriceJod = Number(reg.finalPriceJod) ?? 0;
    await (this.prisma as any).packageRegistration.update({
      where: { id: registrationId },
      data: { isPaid: totalCollected >= finalPriceJod },
    });
    await this.auditLog(data.createdBy ?? null, 'RECEIPT_CREATED', 'Receipt', receipt.id, {
      registrationId,
      receiptId: receipt.receiptId,
      amountPaid: receipt.amountPaid,
      userId: user?.id ?? undefined,
    });
    return receipt;
  }

  async getReceiptsByRegistration(registrationId: string) {
    return (this.prisma as any).receipt.findMany({
      where: { registrationId, voidedAt: null },
      orderBy: { dateTimeIssued: 'desc' },
    });
  }

  async getReceiptById(id: string) {
    const r = await (this.prisma as any).receipt.findUnique({
      where: { id },
      include: {
        registration: true,
        user: { select: { id: true, email: true, name: true, isActive: true } },
      },
    });
    if (!r) throw new NotFoundException('Receipt not found');
    return r;
  }

  /** Get user by email (for member auth / me endpoints). */
  async getUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null; phone: string | null; role: string; isActive: boolean } | null> {
    const e = (email ?? '').trim().toLowerCase();
    if (!e) return null;
    const user = await (this.prisma as any).user.findUnique({
      where: { email: e },
      select: { id: true, email: true, name: true, phone: true, role: true, isActive: true },
    });
    return user;
  }

  /** List receipts (invoices) for a member, most recent first. */
  async getReceiptsByUserId(userId: string) {
    return (this.prisma as any).receipt.findMany({
      where: { userId },
      include: { registration: { select: { finalPriceJod: true, customerName: true, packageName: true } } },
      orderBy: { dateTimeIssued: 'desc' },
    });
  }

  /** Get one receipt if it belongs to the user. */
  async getReceiptByIdForUser(receiptId: string, userId: string) {
    const r = await (this.prisma as any).receipt.findFirst({
      where: { id: receiptId, userId },
      include: { registration: true },
    });
    if (!r) throw new NotFoundException('Receipt not found');
    return r;
  }

  /** Generate receipt PDF buffer for member download. */
  async getReceiptPdfBuffer(receiptId: string, userId: string): Promise<{ buffer: Buffer; filename: string }> {
    const r = await this.getReceiptByIdForUser(receiptId, userId);
    const buffer = await this.generateReceiptPdfToBuffer(r);
    const safe = (r.receiptId || receiptId).replace(/[^a-zA-Z0-9-_]/g, '_');
    return { buffer, filename: `${safe}.pdf` };
  }

  private async generateReceiptPdfToBuffer(receipt: any): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const companyProfile = await this.getCompanyProfile();
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
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
        doc.pipe(w);
        doc.fontSize(20).text('Receipt', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10)
          .text(companyProfile.name || 'Infinity Sport', { align: 'center' })
          .text(companyProfile.address || '', { align: 'center' })
          .text(companyProfile.email || '', { align: 'center' });
        doc.moveDown(2);
        doc.text(`Receipt #: ${receipt.receiptId || receipt.id}`);
        doc.text(`Date: ${receipt.dateTimeIssued ? new Date(receipt.dateTimeIssued).toLocaleString() : '-'}`);
        doc.text(`Customer: ${receipt.personName || '-'}`);
        doc.text(`Phone: ${receipt.personPhone || '-'}`);
        doc.text(`Package: ${receipt.packageName || '-'}`);
        doc.moveDown();
        doc.text(`Amount paid: ${receipt.amountPaid ?? 0} JOD`);
        doc.text(`Payment method: ${receipt.paymentMethod || 'CASH'}`);
        doc.text(`Status: ${receipt.status || 'ACTIVE'}`);
        doc.end();
      } catch (err: any) {
        reject(err);
      }
    });
  }

  async voidReceipt(id: string, voidReason: string) {
    const reason = (voidReason ?? '').trim();
    if (!reason) throw new BadRequestException('voidReason is required when voiding a receipt');
    const r = await (this.prisma as any).receipt.findUnique({ where: { id }, include: { registration: true } });
    if (!r) throw new NotFoundException('Receipt not found');
    if (r.voidedAt || (r as any).status === 'VOIDED') throw new BadRequestException('Receipt is already voided');
    await (this.prisma as any).receipt.update({
      where: { id },
      data: { status: 'VOIDED', voidedAt: new Date(), voidReason: reason },
    });
    await this.auditLog(null, 'RECEIPT_VOIDED', 'Receipt', id, {
      registrationId: r.registrationId,
      voidReason: reason,
    });
    const collected = await (this.prisma as any).receipt.aggregate({
      where: { registrationId: r.registrationId, voidedAt: null },
      _sum: { amountPaid: true },
    });
    const totalCollected = (collected._sum?.amountPaid ?? 0) || 0;
    const finalPriceJod = Number((r.registration as any)?.finalPriceJod) ?? 0;
    await (this.prisma as any).packageRegistration.update({
      where: { id: r.registrationId },
      data: { isPaid: totalCollected >= finalPriceJod },
    });
    return { success: true };
  }

  async getRegistrationTotals(packageName?: string, startDate?: string, endDate?: string) {
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

    const regs = await (this.prisma as any).packageRegistration.findMany({
      where,
      include: { receipts: { where: { voidedAt: null } } },
    });

    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let expectedTotal = 0;
    let collectedTotal = 0;
    let discountsTotal = 0;
    const byMethod: Record<string, number> = { CASH: 0, CARD: 0, TRANSFER: 0, OTHER: 0 };
    const byPackage: Record<string, { registered: number; expected: number; collected: number; remaining: number }> = {};

    for (const r of regs) {
      const finalPrice = Number(r.finalPriceJod) ?? 0;
      const basePrice = Number(r.basePriceJod) ?? 0;
      const collected = (r.receipts || []).reduce((s: number, rec: any) => s + (rec.amountPaid || 0), 0);

      expectedTotal += finalPrice;
      collectedTotal += collected;
      discountsTotal += Math.max(0, basePrice - finalPrice);

      if (collected >= finalPrice) paidCount++;
      else if (collected > 0) partialCount++;
      else unpaidCount++;

      for (const rec of r.receipts || []) {
        const m = (rec.paymentMethod || 'CASH').toUpperCase();
        if (byMethod[m] !== undefined) byMethod[m] += rec.amountPaid || 0;
      }

      if (!packageName) {
        const pkg = r.packageName || '';
        if (!byPackage[pkg]) byPackage[pkg] = { registered: 0, expected: 0, collected: 0, remaining: 0 };
        byPackage[pkg].registered += 1;
        byPackage[pkg].expected += finalPrice;
        byPackage[pkg].collected += collected;
        byPackage[pkg].remaining += Math.max(0, finalPrice - collected);
      }
    }

    return {
      totalRegistered: regs.length,
      paidCount,
      partialCount,
      unpaidCount,
      expectedTotal,
      collectedTotal,
      remainingTotal: expectedTotal - collectedTotal,
      discountsTotal,
      byMethod,
      byPackage: !packageName ? byPackage : undefined,
    };
  }

  async bulkCreatePackageRegistrations(
    data: {
      registrations: Array<{
        packageName: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string | null;
        customerAge?: number | null;
        basePriceJod?: number;
        discountType?: string;
        discountValue?: number | null;
        discountReason?: string | null;
      }>;
    },
  ) {
    const results: { success: boolean; id?: string; row?: number; error?: string }[] = [];
    const now = new Date();
    const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { billingPeriodKey, priceLockedUntil } = this.billingPeriodFromDate(now);
    const seen = new Set<string>();
    const pricingCache: Record<string, number> = {};
    for (let i = 0; i < data.registrations.length; i++) {
      const r = data.registrations[i];
      const pkg = (r.packageName || '').trim();
      const key = `${pkg}|${(r.customerPhone || '').trim()}`;
      if (!r.customerName?.trim() || !r.customerPhone?.trim()) {
        results.push({ success: false, row: i + 1, error: 'Name and phone required' });
        continue;
      }
      if (seen.has(key)) {
        results.push({ success: false, row: i + 1, error: 'Duplicate phone in this batch' });
        continue;
      }
      seen.add(key);
      try {
        const existing = await (this.prisma as any).packageRegistration.findFirst({
          where: { packageName: pkg, customerPhone: (r.customerPhone || '').trim() },
        });
        if (existing) {
          results.push({ success: false, row: i + 1, error: 'Duplicate registration (same package + phone)' });
          continue;
        }
        let basePriceJod = r.basePriceJod;
        if (basePriceJod == null && pricingCache[pkg] !== undefined) basePriceJod = pricingCache[pkg];
        if (basePriceJod == null) {
          const pricing = await (this.prisma as any).packagePricing.findUnique({ where: { packageName: pkg } }).catch(() => null);
          basePriceJod = pricing?.basePriceJod ?? 0;
          pricingCache[pkg] = basePriceJod;
        }
        basePriceJod = Math.max(0, Number(basePriceJod) || 0);
        const discountType = (r.discountType || 'NONE').toUpperCase();
        const discountValue = discountType === 'NONE' ? null : (r.discountValue ?? 0);
        const finalPriceJod = this.computeFinalPriceJod(basePriceJod, discountType, discountValue);
        const discountApplied = discountType !== 'NONE';
        const row = await (this.prisma as any).packageRegistration.create({
          data: {
            packageName: pkg,
            customerName: (r.customerName || '').trim(),
            customerPhone: (r.customerPhone || '').trim(),
            customerEmail: (r.customerEmail || '').trim() || null,
            customerAge: r.customerAge ?? null,
            basePriceJod,
            discountType,
            discountValue: discountType === 'NONE' ? null : Number(discountValue),
            discountReason: discountType === 'NONE' ? null : (r.discountReason || '').trim() || null,
            discountAppliedBy: discountApplied ? null : null,
            discountAppliedAt: discountApplied ? now : null,
            finalPriceJod,
            billingPeriodKey,
            priceLockedUntil,
            periodEndsAt,
          },
        });
        results.push({ success: true, id: row.id, row: i + 1 });
      } catch (e: any) {
        results.push({ success: false, row: i + 1, error: e?.message || 'Create failed' });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      await this.auditLog(null, 'BULK_IMPORT', 'Registration', null, {
        successCount,
        total: results.length,
        failed: results.length - successCount,
      });
    }
    return { results };
  }

  /**
   * Create multiple registrations for the same person (one per package).
   * Uses a transaction: either all created or none.
   * Prevents duplicate active registration for same customerPhone + packageName.
   */
  async bulkCreateForPerson(data: {
    person: { customerName: string; customerPhone: string; customerEmail?: string | null; customerAge?: number | null };
    registrations: Array<{
      packageName: string;
      basePriceJod?: number;
      discountType?: string;
      discountValue?: number | null;
      discountReason?: string | null;
    }>;
  }) {
    const person = data.person;
    const name = (person.customerName || '').trim();
    const phone = (person.customerPhone || '').trim();
    if (!name || !phone) throw new BadRequestException('Person name and phone are required');
    if (!data.registrations?.length) throw new BadRequestException('At least one package is required');

    const packages = data.registrations.map((r) => (r.packageName || '').trim()).filter(Boolean);
    if (packages.length !== data.registrations.length)
      throw new BadRequestException('Every registration must have a package name');

    const prisma = this.prisma as any;
    const existing = await prisma.packageRegistration.findMany({
      where: { customerPhone: phone, packageName: { in: packages } },
      select: { packageName: true },
    });
    const existingSet = new Set(existing.map((e: { packageName: string }) => e.packageName));
    const duplicates = packages.filter((p) => existingSet.has(p));
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Person already has an active registration for: ${duplicates.join(', ')}. Remove or use a different package.`,
      );
    }

    const now = new Date();
    const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { billingPeriodKey, priceLockedUntil } = this.billingPeriodFromDate(now);
    const pricingList = await prisma.packagePricing.findMany({ where: { packageName: { in: packages } } });
    const pricingMap = new Map<string, number | null>(
      pricingList.map((p: { packageName: string; basePriceJod: number | null }) => [p.packageName, p.basePriceJod]),
    );

    const created = await prisma.$transaction(async (tx: any) => {
      const out: any[] = [];
      for (let i = 0; i < data.registrations.length; i++) {
        const r = data.registrations[i];
        const pkg = (r.packageName || '').trim();
        let basePriceJod = r.basePriceJod;
        if (basePriceJod == null) basePriceJod = pricingMap.get(pkg) ?? 0;
        basePriceJod = Math.max(0, Number(basePriceJod) || 0);
        const discountType = (r.discountType || 'NONE').toUpperCase();
        const discountValue = discountType === 'NONE' ? null : (r.discountValue ?? 0);
        if (discountType !== 'NONE' && (discountValue == null || (discountType === 'PERCENT' && (discountValue < 0 || discountValue > 100)) || (discountType === 'AMOUNT' && discountValue < 0)))
          throw new BadRequestException(`Invalid discount for package ${pkg}`);
        if (discountType !== 'NONE' && !(r.discountReason || '').trim())
          throw new BadRequestException(`Discount reason required for package ${pkg}`);
        const finalPriceJod = this.computeFinalPriceJod(basePriceJod, discountType, discountValue);
        const discountApplied = discountType !== 'NONE';
        const row = await tx.packageRegistration.create({
          data: {
            packageName: pkg,
            customerName: name,
            customerPhone: phone,
            customerEmail: (person.customerEmail || '').trim() || null,
            customerAge: person.customerAge ?? null,
            basePriceJod,
            discountType,
            discountValue: discountType === 'NONE' ? null : Number(discountValue),
            discountReason: discountType === 'NONE' ? null : (r.discountReason || '').trim() || null,
            discountAppliedBy: discountApplied ? null : null,
            discountAppliedAt: discountApplied ? now : null,
            finalPriceJod,
            billingPeriodKey,
            priceLockedUntil,
            periodEndsAt,
          },
        });
        out.push({
          id: row.id,
          packageName: row.packageName,
          customerName: row.customerName,
          customerPhone: row.customerPhone,
          customerEmail: row.customerEmail ?? null,
          customerAge: row.customerAge ?? null,
          isPaid: row.isPaid,
          basePriceJod: row.basePriceJod,
          discountType: row.discountType,
          discountValue: row.discountValue ?? null,
          discountReason: row.discountReason ?? null,
          finalPriceJod: row.finalPriceJod,
          periodEndsAt: row.periodEndsAt ?? null,
          isFrozen: row.isFrozen ?? false,
          frozenAt: row.frozenAt ?? null,
          sessionsBonus: row.sessionsBonus ?? 0,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return out;
    });

    return { created: created.length, registrations: created };
  }

  async addSessionAdjustment(registrationId: string, data: { reason: string; createdBy?: string }) {
    const reg = await (this.prisma as any).packageRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found');
    if (!data.reason?.trim()) throw new BadRequestException('Reason is required');
    const adj = await (this.prisma as any).sessionAdjustment.create({
      data: {
        registrationId,
        change: 1,
        reason: data.reason.trim(),
        createdBy: data.createdBy ?? null,
      },
    });
    const bonus = (Number(reg.sessionsBonus) || 0) + 1;
    await (this.prisma as any).packageRegistration.update({
      where: { id: registrationId },
      data: { sessionsBonus: bonus },
    });
    await this.auditLog(data.createdBy ?? null, 'SESSION_ADJUSTED', 'SessionAdjustment', adj.id, {
      registrationId,
      change: 1,
      reason: data.reason.trim(),
      sessionsBonus: bonus,
    });
    return { success: true, sessionsBonus: bonus };
  }

  async getSessionAdjustments(registrationId: string) {
    return (this.prisma as any).sessionAdjustment.findMany({
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- ClassSession (HELD / CANCELED; HELD = consume 1 for everyone in package) ---
  async createClassSession(data: {
    packageName: string;
    sessionDate: string; // YYYY-MM-DD
    status: 'HELD' | 'CANCELED';
    cancelReason?: string | null;
    cancelDetail?: string | null;
    createdBy?: string | null;
  }) {
    const status = (data.status || 'HELD').toUpperCase();
    if (status !== 'HELD' && status !== 'CANCELED')
      throw new BadRequestException('status must be HELD or CANCELED');
    if (status === 'CANCELED' && !(data.cancelReason || '').trim())
      throw new BadRequestException('cancelReason is required when status is CANCELED');
    const sessionDate = new Date(data.sessionDate);
    if (isNaN(sessionDate.getTime())) throw new BadRequestException('Invalid sessionDate');
    const session = await (this.prisma as any).classSession.create({
      data: {
        packageName: (data.packageName || '').trim(),
        sessionDate,
        status,
        cancelReason: status === 'CANCELED' ? (data.cancelReason || '').trim() || null : null,
        cancelDetail: status === 'CANCELED' ? (data.cancelDetail || '').trim() || null : null,
        createdBy: data.createdBy ?? null,
      },
    });
    return session;
  }

  async getClassSessions(packageName?: string, startDate?: string, endDate?: string) {
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
    return (this.prisma as any).classSession.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
    });
  }

  async getPackageSessionCanceled(packageName?: string, startDate?: string, endDate?: string) {
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
    return (this.prisma as any).packageSessionCanceled.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
    });
  }

  async createPackageSessionCanceled(data: {
    packageName: string;
    sessionDate: string;
    reason: string;
    reasonDetail?: string | null;
  }) {
    const validReasons = ['HOLIDAY', 'BAD_WEATHER', 'TEACHER_UNAVAILABLE', 'OTHER'];
    const reason = (data.reason || 'OTHER').toUpperCase();
    if (!validReasons.includes(reason)) throw new BadRequestException('Invalid reason');
    const d = new Date(data.sessionDate);
    if (isNaN(d.getTime())) throw new BadRequestException('Invalid session date');
    return (this.prisma as any).packageSessionCanceled.create({
      data: {
        packageName: data.packageName.trim(),
        sessionDate: d,
        reason,
        reasonDetail: data.reasonDetail?.trim() || null,
      },
    });
  }
}

