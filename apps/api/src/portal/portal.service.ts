import { Injectable } from '@nestjs/common';
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
import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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
  async getInvoices(companyId?: string, status?: InvoiceStatus): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: {
        companyId: companyId || undefined,
        status: status || undefined,
      },
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

  async createInvoice(
    data: Prisma.InvoiceCreateInput & { generatePdf?: boolean } & Record<string, unknown>
  ): Promise<Invoice> {
    // IMPORTANT: We intentionally persist extended invoice fields inside `description` JSON to avoid DB migrations.
    // This keeps invoice creation working even if the database schema only has the original Invoice columns.

    const generatePdf =
      Boolean((data as any)?.generatePdf) ||
      Boolean((data as any)?.clientName) ||
      Boolean((data as any)?.lineItems);

    const paymentMethod: 'CARD' | 'CASH' = ((data as any)?.paymentMethod as any) || 'CARD';

    const invoiceNumber = data.number ? String(data.number) : await this.generateInvoiceNumber();
    const issuedAtIso = (data as any)?.issuedAt ? String((data as any).issuedAt) : new Date().toISOString();

    const meta = {
      v: 1,
      companyName: (data as any)?.companyName || 'Infinity Sporty',
      companyAddress: (data as any)?.companyAddress || '',
      clientName: (data as any)?.clientName || '',
      clientEmail: (data as any)?.clientEmail || '',
      clientAddress: (data as any)?.clientAddress || '',
      currency: (data as any)?.currency || 'JOD',
      paymentMethod,
      lineItems: Array.isArray((data as any)?.lineItems) ? (data as any).lineItems : [],
      subtotal: (data as any)?.subtotal ?? null,
      tax: (data as any)?.tax ?? null,
      discount: (data as any)?.discount ?? null,
      notes: (data as any)?.notes ?? null,
      pdfPath: null as null | string,
    };

    // Strip non-schema fields so Prisma doesn't try to write missing DB columns.
    const createData: Prisma.InvoiceCreateInput = {
      number: invoiceNumber,
      amount: Number.isFinite((data as any)?.amount) ? (data as any).amount : 0,
      currency: String((data as any)?.currency || 'JOD'),
      status: (data as any)?.status || 'DRAFT',
      issuedAt: new Date(issuedAtIso),
      dueDate: (data as any)?.dueDate ? new Date(String((data as any).dueDate)) : undefined,
      paidAt: (data as any)?.paidAt ? new Date(String((data as any).paidAt)) : undefined,
      description: JSON.stringify(meta),
      company: (data as any)?.company,
      member: (data as any)?.member,
      subscription: (data as any)?.subscription,
    };

    const created = await this.prisma.invoice.create({ data: createData });

    if (generatePdf) {
      const pdfPath = await this.generateInvoicePdf({
        number: created.number,
        issuedAt: created.issuedAt,
        dueDate: created.dueDate,
        currency: created.currency,
        amount: created.amount,
        meta,
      });

      meta.pdfPath = pdfPath;

      return this.prisma.invoice.update({
        where: { id: created.id },
        data: { description: JSON.stringify(meta) },
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

    const companyName = input.meta?.companyName || 'Infinity Sporty';
    const companyAddress = input.meta?.companyAddress || '';

    // Try to load a logo from the monorepo (no new assets required)
    const candidateLogoPaths = [
      join(process.cwd(), 'apps', 'web', 'public', 'infinity-logo.png'),
      join(process.cwd(), 'apps', 'portal', 'public', 'infinity-logo.png'),
    ];
    const logoPath = input.meta?.logoPath || candidateLogoPaths.find((p) => existsSync(p));

    const headerY = 50;
    if (logoPath && existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, headerY, { width: 56, height: 56 });
      } catch {
        // Ignore logo failures; branding still present via text.
      }
    }

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text(companyName, 120, headerY);
    doc.font('Helvetica').fontSize(10).fillColor('#4B5563').text(companyAddress, 120, headerY + 28, { width: 240 });

    // Invoice meta (right aligned)
    const rightX = 350;
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text('INVOICE', rightX, headerY, { align: 'right', width: 190 });

    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    const issuedAt = input.issuedAt ? new Date(input.issuedAt) : new Date();
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;

    const metaLines: Array<[string, string]> = [
      ['Invoice #', input.number],
      ['Issue date', issuedAt.toLocaleDateString()],
      ['Due date', dueDate ? dueDate.toLocaleDateString() : '—'],
      ['Currency', input.currency || 'JOD'],
    ];

    let metaY = headerY + 34;
    metaLines.forEach(([k, v]) => {
      doc.font('Helvetica-Bold').text(`${k}:`, rightX, metaY, { align: 'right', width: 190, continued: true });
      doc.font('Helvetica').text(` ${v}`, { align: 'right' });
      metaY += 16;
    });

    // Divider
    doc.moveTo(50, 130).lineTo(545, 130).lineWidth(1).strokeColor('#E5E7EB').stroke();

    // Bill To
    const clientName = input.meta?.clientName || '';
    const clientEmail = input.meta?.clientEmail || '';
    const clientAddress = input.meta?.clientAddress || '';

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Bill To', 50, 150);
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    doc.text(clientName, 50, 168, { width: 260 });
    if (clientEmail) doc.text(clientEmail, 50, doc.y + 2, { width: 260 });
    if (clientAddress) doc.text(clientAddress, 50, doc.y + 2, { width: 260 });

    // Items table
    const itemsRaw = input.meta?.lineItems;
    const items: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }> =
      Array.isArray(itemsRaw) ? itemsRaw : [];

    const tableTop = 240;
    const col = {
      desc: { x: 50, w: 290 },
      qty: { x: 345, w: 45 },
      unit: { x: 395, w: 70 },
      total: { x: 470, w: 75 },
    };

    doc.rect(50, tableTop, 495, 24).fillColor('#F3F4F6').fill();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
    doc.text('Description', col.desc.x, tableTop + 7, { width: col.desc.w });
    doc.text('Qty', col.qty.x, tableTop + 7, { width: col.qty.w, align: 'right' });
    doc.text('Unit', col.unit.x, tableTop + 7, { width: col.unit.w, align: 'right' });
    doc.text('Total', col.total.x, tableTop + 7, { width: col.total.w, align: 'right' });

    const money = (n: number) =>
      Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

    doc.font('Helvetica').fontSize(10).fillColor('#111827');
    let y = tableTop + 30;
    const rowGap = 10;

    items.forEach((item) => {
      const descY = y;
      const descText = item.description || '—';
      doc.text(descText, col.desc.x, descY, { width: col.desc.w });
      const descHeight = doc.heightOfString(descText, { width: col.desc.w });
      const rowHeight = Math.max(18, descHeight);

      doc.text(String(item.quantity ?? 0), col.qty.x, descY, { width: col.qty.w, align: 'right' });
      doc.text(money(item.unitPrice ?? 0), col.unit.x, descY, { width: col.unit.w, align: 'right' });
      doc.text(money(item.lineTotal ?? 0), col.total.x, descY, { width: col.total.w, align: 'right' });

      y += rowHeight + rowGap;

      // Page break for large invoices
      if (y > 650) {
        doc.addPage();
        y = 80;
      }
    });

    const dividerY = Math.min(y + 6, 720);
    doc.moveTo(50, dividerY).lineTo(545, dividerY).lineWidth(1).strokeColor('#E5E7EB').stroke();

    // Totals (right)
    const subtotal =
      typeof input.meta?.subtotal === 'number' ? input.meta.subtotal : items.reduce((sum, i) => sum + (Number(i.lineTotal) || 0), 0);
    const tax = Number(input.meta?.tax) || 0;
    const discount = Number(input.meta?.discount) || 0;
    const grandTotal = Number.isFinite(input.amount) ? input.amount : subtotal + tax - discount;

    let totalsY = dividerY + 16;
    const totalsX = 350;
    const labelW = 110;
    const valueW = 85;

    const totalsLines: Array<[string, number]> = [
      ['Subtotal', subtotal],
      ...(tax ? [['Tax', tax] as [string, number]] : []),
      ...(discount ? [['Discount', -discount] as [string, number]] : []),
    ];

    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    totalsLines.forEach(([label, val]) => {
      doc.text(label, totalsX, totalsY, { width: labelW, align: 'right' });
      doc.text(money(val), totalsX + labelW, totalsY, { width: valueW, align: 'right' });
      totalsY += 16;
    });

    doc.rect(totalsX, totalsY + 4, labelW + valueW, 28).fillColor('#111827').fill();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
    doc.text('Total', totalsX, totalsY + 12, { width: labelW, align: 'right' });
    doc.text(money(grandTotal), totalsX + labelW, totalsY + 12, { width: valueW, align: 'right' });

    const notes = input.meta?.notes || '';
    if (notes) {
      const notesY = Math.max(580, totalsY + 50);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Notes / Payment Terms', 50, notesY);
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text(notes, 50, notesY + 18, { width: 495 });
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', (e) => reject(e));
    });

    return `/uploads/invoices/${filename}`;
  }

  async updateInvoice(id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data,
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
}

