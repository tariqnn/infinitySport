import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  StreamableFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { PortalService } from './portal.service';
import { Prisma } from '@prisma/client';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  // Companies
  @Get('companies')
  async getCompanies() {
    return this.portalService.getCompanies();
  }

  @Get('companies/:id')
  async getCompany(@Param('id') id: string) {
    return this.portalService.getCompany(id);
  }

  @Post('companies')
  async createCompany(@Body() data: Prisma.CompanyCreateInput) {
    try {
      return await this.portalService.createCompany(data);
    } catch (error: any) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  @Patch('companies/:id')
  async updateCompany(@Param('id') id: string, @Body() data: Prisma.CompanyUpdateInput) {
    return this.portalService.updateCompany(id, data);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompany(@Param('id') id: string) {
    await this.portalService.deleteCompany(id);
  }

  // Members
  @Get('members')
  async getMembers(@Query('companyId') companyId?: string) {
    return this.portalService.getMembers(companyId);
  }

  @Get('members/:id')
  async getMember(@Param('id') id: string) {
    return this.portalService.getMember(id);
  }

  @Post('members')
  async createMember(@Body() data: Prisma.MemberCreateInput) {
    return this.portalService.createMember(data);
  }

  @Patch('members/:id')
  async updateMember(@Param('id') id: string, @Body() data: Prisma.MemberUpdateInput) {
    return this.portalService.updateMember(id, data);
  }

  @Delete('members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMember(@Param('id') id: string) {
    await this.portalService.deleteMember(id);
  }

  // Default company ID for public/mobile booking (call this first, then use in POST /bookings)
  @Get('booking-defaults')
  async getBookingDefaults() {
    return this.portalService.getBookingDefaults();
  }

  // Bookings
  @Get('bookings')
  async getBookings(
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const bookings = await this.portalService.getBookings(
        companyId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return bookings;
    } catch (error) {
      console.error('Error in getBookings controller:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  @Get('bookings/:id')
  async getBooking(@Param('id') id: string) {
    return this.portalService.getBooking(id);
  }

  @Post('bookings')
  async createBooking(@Body() data: Prisma.BookingCreateInput) {
    return this.portalService.createBooking(data);
  }

  @Patch('bookings/:id')
  async updateBooking(@Param('id') id: string, @Body() data: Prisma.BookingUpdateInput) {
    return this.portalService.updateBooking(id, data);
  }

  @Delete('bookings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBooking(@Param('id') id: string) {
    const trimmed = (id ?? '').toString().trim();
    if (!trimmed) {
      throw new BadRequestException('Invalid or missing booking ID.');
    }
    await this.portalService.deleteBooking(trimmed);
  }

  // Blocked slots (booking availability). Optional startDate/endDate filter so slots only active in that range are returned (for single-date blocks).
  @Get('blocked-slots')
  async getBlockedSlots(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getBlockedSlots(startDate || undefined, endDate || undefined);
  }

  @Post('blocked-slots')
  async createBlockedSlot(@Body() data: { dayOfWeek: string; courtType: string; time: string; isBlocked?: boolean; label?: string | null; startDate?: string | null; endDate?: string | null }) {
    return this.portalService.createBlockedSlot(data);
  }

  @Post('blocked-slots/bulk')
  async createBlockedSlotsBulk(@Body() data: { courtType: string; time: string; daysOfWeek?: string[]; label?: string | null; startDate?: string | null; endDate?: string | null }) {
    const daysOfWeek = Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [];
    if (!data.courtType || !data.time || daysOfWeek.length === 0) {
      throw new BadRequestException('courtType, time, and at least one day in daysOfWeek are required.');
    }
    return this.portalService.createBlockedSlotsBulk({
      courtType: data.courtType,
      time: data.time,
      daysOfWeek,
      label: data.label ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
    });
  }

  @Patch('blocked-slots/:id')
  async updateBlockedSlot(@Param('id') id: string, @Body() data: { isBlocked?: boolean; label?: string | null; startDate?: string | null; endDate?: string | null }) {
    return this.portalService.updateBlockedSlot(id, data);
  }

  @Delete('blocked-slots/:id')
  async deleteBlockedSlot(@Param('id') id: string) {
    await this.portalService.deleteBlockedSlot(id);
  }

  @Delete('blocked-slots/by-label/:label')
  async deleteBlockedSlotsByLabel(@Param('label') label: string) {
    const count = await this.portalService.deleteBlockedSlotsByLabel(decodeURIComponent(label));
    return { deleted: count };
  }

  // Subscriptions
  @Get('subscriptions')
  async getSubscriptions(@Query('companyId') companyId?: string, @Query('memberId') memberId?: string) {
    return this.portalService.getSubscriptions(companyId, memberId);
  }

  @Get('subscriptions/:id')
  async getSubscription(@Param('id') id: string) {
    return this.portalService.getSubscription(id);
  }

  @Post('subscriptions')
  async createSubscription(@Body() data: Prisma.SubscriptionCreateInput) {
    return this.portalService.createSubscription(data);
  }

  @Patch('subscriptions/:id')
  async updateSubscription(@Param('id') id: string, @Body() data: Prisma.SubscriptionUpdateInput) {
    return this.portalService.updateSubscription(id, data);
  }

  @Delete('subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscription(@Param('id') id: string) {
    await this.portalService.deleteSubscription(id);
  }

  // Invoices
  @Get('invoices')
  async getInvoices(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getInvoices(companyId, status as any, startDate, endDate);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string) {
    return this.portalService.getInvoice(id);
  }

  @Get('invoices/:id/pdf')
  async getInvoicePdf(@Param('id') id: string) {
    const { buffer, filename } = await this.portalService.getInvoicePdfBuffer(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('invoices')
  async createInvoice(@Body() data: any) {
    try {
      return await this.portalService.createInvoice(data);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  @Patch('invoices/:id')
  async updateInvoice(@Param('id') id: string, @Body() data: Prisma.InvoiceUpdateInput) {
    return this.portalService.updateInvoice(id, data);
  }

  @Delete('invoices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvoice(@Param('id') id: string) {
    await this.portalService.deleteInvoice(id);
  }

  // Budget Categories
  @Get('budget-categories')
  async getBudgetCategories(@Query('companyId') companyId?: string) {
    return this.portalService.getBudgetCategories(companyId);
  }

  @Get('budget-categories/:id')
  async getBudgetCategory(@Param('id') id: string) {
    return this.portalService.getBudgetCategory(id);
  }

  @Post('budget-categories')
  async createBudgetCategory(@Body() data: Prisma.BudgetCategoryCreateInput) {
    return this.portalService.createBudgetCategory(data);
  }

  @Patch('budget-categories/:id')
  async updateBudgetCategory(@Param('id') id: string, @Body() data: Prisma.BudgetCategoryUpdateInput) {
    return this.portalService.updateBudgetCategory(id, data);
  }

  @Delete('budget-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBudgetCategory(@Param('id') id: string) {
    await this.portalService.deleteBudgetCategory(id);
  }

  // Budget Entries
  @Get('budget-entries')
  async getBudgetEntries(
    @Query('companyId') companyId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.portalService.getBudgetEntries(
      companyId,
      categoryId,
      periodStart ? new Date(periodStart) : undefined,
      periodEnd ? new Date(periodEnd) : undefined,
    );
  }

  @Get('budget-entries/:id')
  async getBudgetEntry(@Param('id') id: string) {
    return this.portalService.getBudgetEntry(id);
  }

  @Post('budget-entries')
  async createBudgetEntry(@Body() data: Prisma.BudgetEntryCreateInput) {
    return this.portalService.createBudgetEntry(data);
  }

  @Patch('budget-entries/:id')
  async updateBudgetEntry(@Param('id') id: string, @Body() data: Prisma.BudgetEntryUpdateInput) {
    return this.portalService.updateBudgetEntry(id, data);
  }

  @Delete('budget-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBudgetEntry(@Param('id') id: string) {
    await this.portalService.deleteBudgetEntry(id);
  }

  // Cash Flow Entries
  @Get('cash-flow')
  async getCashFlowEntries(
    @Query('companyId') companyId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getCashFlowEntries(
      companyId,
      type,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('cash-flow/:id')
  async getCashFlowEntry(@Param('id') id: string) {
    return this.portalService.getCashFlowEntry(id);
  }

  @Post('cash-flow')
  async createCashFlowEntry(@Body() data: Prisma.CashFlowEntryCreateInput) {
    return this.portalService.createCashFlowEntry(data);
  }

  @Patch('cash-flow/:id')
  async updateCashFlowEntry(@Param('id') id: string, @Body() data: Prisma.CashFlowEntryUpdateInput) {
    return this.portalService.updateCashFlowEntry(id, data);
  }

  @Delete('cash-flow/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCashFlowEntry(@Param('id') id: string) {
    await this.portalService.deleteCashFlowEntry(id);
  }

  // Petty Cash Transactions
  @Get('petty-cash')
  async getPettyCashTransactions(
    @Query('companyId') companyId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getPettyCashTransactions(
      companyId,
      type,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('petty-cash/:id')
  async getPettyCashTransaction(@Param('id') id: string) {
    return this.portalService.getPettyCashTransaction(id);
  }

  @Post('petty-cash')
  async createPettyCashTransaction(@Body() data: Prisma.PettyCashTransactionCreateInput) {
    return this.portalService.createPettyCashTransaction(data);
  }

  @Patch('petty-cash/:id')
  async updatePettyCashTransaction(@Param('id') id: string, @Body() data: Prisma.PettyCashTransactionUpdateInput) {
    return this.portalService.updatePettyCashTransaction(id, data);
  }

  @Delete('petty-cash/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePettyCashTransaction(@Param('id') id: string) {
    await this.portalService.deletePettyCashTransaction(id);
  }

  // Coaches
  @Get('coaches')
  async getCoaches(@Query('companyId') companyId?: string) {
    return this.portalService.getCoaches(companyId);
  }

  @Get('coaches/:id')
  async getCoach(@Param('id') id: string) {
    return this.portalService.getCoach(id);
  }

  @Post('coaches')
  async createCoach(@Body() data: Prisma.CoachCreateInput) {
    return this.portalService.createCoach(data);
  }

  @Patch('coaches/:id')
  async updateCoach(@Param('id') id: string, @Body() data: Prisma.CoachUpdateInput) {
    return this.portalService.updateCoach(id, data);
  }

  @Delete('coaches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCoach(@Param('id') id: string) {
    await this.portalService.deleteCoach(id);
  }

  // Classes
  @Get('classes')
  async getClasses(@Query('companyId') companyId?: string, @Query('coachId') coachId?: string) {
    return this.portalService.getClasses(companyId, coachId);
  }

  @Get('classes/:id')
  async getClass(@Param('id') id: string) {
    return this.portalService.getClass(id);
  }

  @Post('classes')
  async createClass(@Body() data: Prisma.ClassCreateInput) {
    return this.portalService.createClass(data);
  }

  @Patch('classes/:id')
  async updateClass(@Param('id') id: string, @Body() data: Prisma.ClassUpdateInput) {
    return this.portalService.updateClass(id, data);
  }

  @Delete('classes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string) {
    await this.portalService.deleteClass(id);
  }

  // Class Enrollments
  @Get('enrollments')
  async getEnrollments(@Query('classId') classId?: string, @Query('memberId') memberId?: string) {
    return this.portalService.getEnrollments(classId, memberId);
  }

  @Get('enrollments/:id')
  async getEnrollment(@Param('id') id: string) {
    return this.portalService.getEnrollment(id);
  }

  @Post('enrollments')
  async createEnrollment(@Body() data: Prisma.ClassEnrollmentCreateInput) {
    return this.portalService.createEnrollment(data);
  }

  @Delete('enrollments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEnrollment(@Param('id') id: string) {
    await this.portalService.deleteEnrollment(id);
  }

  // Inventory Items
  @Get('inventory')
  async getInventoryItems(@Query('companyId') companyId?: string, @Query('status') status?: string) {
    return this.portalService.getInventoryItems(companyId, status as any);
  }

  @Get('inventory/:id')
  async getInventoryItem(@Param('id') id: string) {
    return this.portalService.getInventoryItem(id);
  }

  @Post('inventory')
  async createInventoryItem(@Body() data: Prisma.InventoryItemCreateInput) {
    return this.portalService.createInventoryItem(data);
  }

  @Patch('inventory/:id')
  async updateInventoryItem(@Param('id') id: string, @Body() data: Prisma.InventoryItemUpdateInput) {
    return this.portalService.updateInventoryItem(id, data);
  }

  @Delete('inventory/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInventoryItem(@Param('id') id: string) {
    await this.portalService.deleteInventoryItem(id);
  }

  // Staff Tasks
  @Get('staff-tasks')
  async getStaffTasks(@Query('companyId') companyId?: string, @Query('status') status?: string) {
    return this.portalService.getStaffTasks(companyId, status as any);
  }

  @Get('staff-tasks/:id')
  async getStaffTask(@Param('id') id: string) {
    return this.portalService.getStaffTask(id);
  }

  @Post('staff-tasks')
  async createStaffTask(@Body() data: Prisma.StaffTaskCreateInput) {
    return this.portalService.createStaffTask(data);
  }

  @Patch('staff-tasks/:id')
  async updateStaffTask(@Param('id') id: string, @Body() data: Prisma.StaffTaskUpdateInput) {
    return this.portalService.updateStaffTask(id, data);
  }

  @Delete('staff-tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStaffTask(@Param('id') id: string) {
    await this.portalService.deleteStaffTask(id);
  }

  // Company Settings
  @Get('settings/:companyId')
  async getCompanySettings(@Param('companyId') companyId: string) {
    return this.portalService.getCompanySettings(companyId);
  }

  @Post('settings')
  async createCompanySettings(@Body() data: Prisma.CompanySettingsCreateInput) {
    return this.portalService.createCompanySettings(data);
  }

  @Patch('settings/:companyId')
  async updateCompanySettings(@Param('companyId') companyId: string, @Body() data: Prisma.CompanySettingsUpdateInput) {
    return this.portalService.updateCompanySettings(companyId, data);
  }

  // Dashboard
  @Get('dashboard/stats')
  async getDashboardStats(@Query('companyId') companyId?: string) {
    return this.portalService.getDashboardStats(companyId);
  }

  // Package pricing (base price per package; null = manual)
  @Get('package-pricing')
  async getPackagePricing() {
    return this.portalService.getPackagePricing();
  }

  // Sellable packages (from Package table; for registration form and default price)
  @Get('packages')
  async getPackages() {
    return this.portalService.getPackages();
  }

  // Package Registrations (public POST for form; GET/PATCH for admin)
  @Get('package-registrations')
  async getPackageRegistrations(
    @Query('packageName') packageName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    try {
      const pageNum = page != null ? parseInt(page, 10) : undefined;
      const pageSizeNum = pageSize != null ? parseInt(pageSize, 10) : undefined;
      return await this.portalService.getPackageRegistrations(
        packageName,
        startDate,
        endDate,
        pageNum,
        pageSizeNum,
      );
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error('[portal] getPackageRegistrations failed:', message, err);
      throw new InternalServerErrorException(
        process.env.NODE_ENV !== 'production' ? message : 'Failed to load registrations',
      );
    }
  }

  @Post('package-registrations')
  async createPackageRegistration(
    @Body()
    data: {
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
    },
  ) {
    return this.portalService.createPackageRegistration(data);
  }

  @Get('package-registrations/totals')
  async getRegistrationTotals(
    @Query('packageName') packageName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getRegistrationTotals(packageName, startDate, endDate);
  }

  @Post('package-registrations/bulk')
  async bulkCreatePackageRegistrations(
    @Body()
    data: {
      startDate?: string | null;
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
        periodStartsAt?: string | null;
      }>;
    },
  ) {
    return this.portalService.bulkCreatePackageRegistrations(data);
  }

  @Post('package-registrations/bulk-for-person')
  async bulkCreateForPerson(
    @Body()
    data: {
      person: { customerName: string; customerPhone: string; customerEmail?: string | null; customerAge?: number | null };
      periodStartsAt?: string | null;
      registrations: Array<{
        packageName: string;
        basePriceJod?: number;
        discountType?: string;
        discountValue?: number | null;
        discountReason?: string | null;
        periodStartsAt?: string | null;
      }>;
    },
  ) {
    return this.portalService.bulkCreateForPerson(data);
  }

  @Patch('package-registrations/:id')
  async updatePackageRegistration(
    @Param('id') id: string,
    @Body()
    data: {
      isPaid?: boolean;
      isFrozen?: boolean;
      basePriceJod?: number;
      discountType?: string;
      discountValue?: number | null;
      discountReason?: string | null;
      periodStartsAt?: string | null;
      periodEndsAt?: string | null;
    },
  ) {
    return this.portalService.updatePackageRegistration(id, data);
  }

  @Delete('package-registrations/:id')
  async deletePackageRegistration(@Param('id') id: string) {
    await this.portalService.deletePackageRegistration(id);
    return { success: true };
  }

  @Post('package-registrations/:id/reregister')
  async reregister(@Param('id') id: string) {
    return this.portalService.reregister(id);
  }

  @Post('package-registrations/:id/mark-paid')
  async markRegistrationPaid(
    @Param('id') id: string,
    @Body() body: { amountPaid: number; paymentMethod: string; privateNote: string; createdBy?: string },
  ) {
    return this.portalService.createReceiptForMarkPaid(id, body);
  }

  @Post('package-registrations/:id/mark-unpaid')
  async markRegistrationUnpaid(
    @Param('id') id: string,
    @Body() body?: { voidReason?: string },
  ) {
    return this.portalService.markRegistrationUnpaid(id, body?.voidReason ?? '');
  }

  @Get('package-registrations/:id/receipts')
  async getReceiptsByRegistration(@Param('id') id: string) {
    return this.portalService.getReceiptsByRegistration(id);
  }

  @Get('receipts/:id')
  async getReceipt(@Param('id') id: string) {
    return this.portalService.getReceiptById(id);
  }

  @Patch('receipts/:id/void')
  async voidReceipt(@Param('id') id: string, @Body() body: { voidReason?: string }) {
    await this.portalService.voidReceipt(id, body.voidReason ?? '');
    return { success: true };
  }

  @Post('package-registrations/:id/session-adjustment')
  async addSessionAdjustment(
    @Param('id') id: string,
    @Body() body: { reason: string; createdBy?: string },
  ) {
    return this.portalService.addSessionAdjustment(id, body);
  }

  @Get('package-registrations/:id/session-adjustments')
  async getSessionAdjustments(@Param('id') id: string) {
    return this.portalService.getSessionAdjustments(id);
  }

  @Get('package-session-canceled')
  async getPackageSessionCanceled(
    @Query('packageName') packageName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getPackageSessionCanceled(packageName, startDate, endDate);
  }

  @Post('package-session-canceled')
  async createPackageSessionCanceled(
    @Body() data: { packageName: string; sessionDate: string; reason: string; reasonDetail?: string | null },
  ) {
    return this.portalService.createPackageSessionCanceled(data);
  }

  @Get('class-sessions')
  async getClassSessions(
    @Query('packageName') packageName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.portalService.getClassSessions(packageName, startDate, endDate);
  }

  @Post('class-sessions')
  async createClassSession(
    @Body()
    data: {
      packageName: string;
      sessionDate: string;
      status: 'HELD' | 'CANCELED';
      cancelReason?: string | null;
      cancelDetail?: string | null;
      createdBy?: string | null;
    },
  ) {
    return this.portalService.createClassSession(data);
  }
}

