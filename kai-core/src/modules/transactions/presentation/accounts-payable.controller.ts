import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  AccountsPayableService,
  AccountsPayablePaymentType,
} from '../application/services/accounts-payable.service';
import type { AccountsPayableOriginCategory } from '../application/helpers/accounts-payable-origin.util';
import { CompletePaymentCommand } from '../application/commands/complete-payment.usecase';
import { CompletePaymentDto } from '../application/dto/complete-payment.dto';

@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  async list(
    @Query('paymentType') paymentType?: string,
    @Query('sourceType') sourceType?: string,
    @Query('payeeType') payeeType?: string,
    @Query('supplierId') supplierId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('search') search?: string,
  ) {
    const filters: Parameters<AccountsPayableService['list']>[0] = {};

    const typeRaw = paymentType || sourceType;
    if (typeRaw) {
      const legacyOrigin = this.mapLegacySourceTypeToOriginCategory(typeRaw);
      if (legacyOrigin) {
        filters.originCategory = legacyOrigin.includes(',')
          ? (legacyOrigin.split(',') as AccountsPayableOriginCategory[])
          : (legacyOrigin as AccountsPayableOriginCategory);
      } else {
        filters.paymentType = typeRaw.includes(',')
          ? (typeRaw.split(',') as AccountsPayablePaymentType[])
          : (typeRaw as AccountsPayablePaymentType);
      }
    }

    if (payeeType) filters.payeeType = payeeType;
    if (supplierId) filters.supplierId = supplierId;
    if (employeeId) filters.employeeId = employeeId;
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);
    if (overdueOnly === 'true') filters.overdueOnly = true;
    if (search?.trim()) filters.search = search.trim();

    return this.accountsPayableService.list(filters);
  }

  @Get(':id/payment-context')
  async getPaymentContext(@Param('id') id: string) {
    return this.accountsPayableService.getPaymentContext(id);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() data?: CompletePaymentDto) {
    const result = await this.commandBus.execute(
      new CompletePaymentCommand(id, data || {}),
    );
    return { success: true, data: result };
  }

  private mapLegacySourceTypeToOriginCategory(
    sourceType: string,
  ): string | null {
    const parts = sourceType.split(',').map((p) => p.trim());
    const mapped = parts.map((p) => {
      if (p === 'PURCHASE') return 'PURCHASE';
      if (p === 'PAYROLL') return 'PAYROLL';
      if (p === 'OPERATING_EXPENSE') return 'OPERATING_EXPENSE';
      return null;
    });
    if (mapped.some((m) => m === null)) {
      return null;
    }
    return mapped.join(',');
  }
}
