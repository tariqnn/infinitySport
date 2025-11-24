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
    return this.prisma.booking.findMany({
      where: {
        companyId: companyId || undefined,
        startTime: startDate
          ? {
              gte: startDate,
              lte: endDate,
            }
          : undefined,
      },
      include: {
        company: true,
        program: true,
        facility: true,
        member: true,
        class: true,
        coach: true,
      },
      orderBy: { startTime: 'asc' },
    });
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
        subscription: true,
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

  async createInvoice(data: Prisma.InvoiceCreateInput): Promise<Invoice> {
    // Generate invoice number if not provided
    if (!data.number) {
      const count = await this.prisma.invoice.count();
      data.number = `INV-${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.invoice.create({ data });
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

