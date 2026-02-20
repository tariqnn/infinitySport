import {
  Controller,
  Get,
  Param,
  Headers,
  UnauthorizedException,
  StreamableFile,
} from '@nestjs/common';
import { PortalService } from './portal.service';

/**
 * Member-facing "me" endpoints: profile and invoices (receipts).
 * Auth: use x-member-email header (same email as registration) until JWT is added.
 * In production, replace with JWT guard and req.user.
 */
@Controller('portal')
export class MeController {
  constructor(private readonly portalService: PortalService) {}

  private async resolveUser(emailHeader: string | undefined): Promise<{ id: string; email: string; name: string | null; phone: string | null; role: string; isActive: boolean }> {
    const email = (emailHeader ?? '').trim();
    if (!email) {
      throw new UnauthorizedException('Missing x-member-email header. Use the email used at registration.');
    }
    const user = await this.portalService.getUserByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or inactive. Complete a paid registration first.');
    }
    return user;
  }

  @Get('me')
  async getMe(@Headers('x-member-email') email: string) {
    const user = await this.resolveUser(email);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    };
  }

  @Get('me/invoices')
  async getMyInvoices(@Headers('x-member-email') email: string) {
    const user = await this.resolveUser(email);
    const receipts = await this.portalService.getReceiptsByUserId(user.id);
    return receipts.map((r: any) => ({
      id: r.id,
      invoiceNumber: r.receiptId,
      date: r.dateTimeIssued,
      amount: r.amountPaid,
      currency: 'JOD',
      status: r.status === 'VOIDED' ? 'Refunded' : 'Paid',
      registrationId: r.registrationId,
      packageName: r.packageName,
    }));
  }

  @Get('me/receipts/:id')
  async getMyReceipt(@Param('id') id: string, @Headers('x-member-email') email: string) {
    const user = await this.resolveUser(email);
    return this.portalService.getReceiptByIdForUser(id, user.id);
  }

  @Get('me/receipts/:id/pdf')
  async getMyReceiptPdf(@Param('id') id: string, @Headers('x-member-email') email: string) {
    const user = await this.resolveUser(email);
    const { buffer, filename } = await this.portalService.getReceiptPdfBuffer(id, user.id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
