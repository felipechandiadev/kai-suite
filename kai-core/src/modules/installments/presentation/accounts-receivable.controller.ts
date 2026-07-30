import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentStatus } from '@modules/installments/domain/installment.entity';
import { CurrentCompany } from '@common/tenant';
import { CompleteAccountsReceivablePaymentDto } from '@modules/installments/application/dto/complete-accounts-receivable-payment.dto';
import type { AccountsReceivableListFilters } from '@modules/installments/application/dto/accounts-receivable-row.dto';

@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(private readonly installmentService: InstallmentService) {}

  @Get()
  async getAccountsReceivable(
    @CurrentCompany() companyId: string,
    @Query('filters') filtersRaw?: string,
    @Query('search') search?: string,
    @Query('status') statusRaw?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('includePaid') includePaidRaw?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters = this.resolveFilters({
      filtersRaw,
      search,
      statusRaw,
      customerId,
      fromDate,
      toDate,
      overdueOnly,
      includePaidRaw,
      page,
      pageSize,
      companyId,
    });

    return this.installmentService.getAccountsReceivable(filters);
  }

  @Get(':id/payment-context')
  async getPaymentContext(@Param('id') id: string) {
    return this.installmentService.getPaymentContext(id);
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteAccountsReceivablePaymentDto,
  ) {
    const result = await this.installmentService.payInstallment(id, {
      paymentMethod: dto.paymentMethod,
      companyAccountKey: dto.companyAccountKey,
      cashHubId: dto.cashHubId,
      note: dto.note,
      amount: dto.amount,
    });
    return { success: true, data: result };
  }

  private resolveFilters(input: {
    filtersRaw?: string;
    search?: string;
    statusRaw?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
    overdueOnly?: string;
    includePaidRaw?: string;
    page?: string;
    pageSize?: string;
    companyId: string;
  }): AccountsReceivableListFilters {
    let legacy: Record<string, unknown> = {};
    if (input.filtersRaw) {
      try {
        legacy = JSON.parse(input.filtersRaw) as Record<string, unknown>;
      } catch {
        legacy = {};
      }
    }

    const search =
      input.search?.trim() ||
      (typeof legacy.search === 'string' ? legacy.search.trim() : undefined);

    const statusSource =
      input.statusRaw ||
      (legacy.status != null ? String(legacy.status) : undefined);
    const status = statusSource
      ? (statusSource.split(',').map((s) => s.trim()) as InstallmentStatus[])
      : undefined;

    const customerId =
      input.customerId ||
      (typeof legacy.customerId === 'string' ? legacy.customerId : undefined);

    const fromDateStr =
      input.fromDate ||
      (typeof legacy.fromDate === 'string' ? legacy.fromDate : undefined);
    const toDateStr =
      input.toDate ||
      (typeof legacy.toDate === 'string' ? legacy.toDate : undefined);

    const includePaid =
      input.includePaidRaw === 'true' ||
      Boolean(legacy.includePaid);

    const overdueOnly =
      input.overdueOnly === 'true' || Boolean(legacy.overdueOnly);

    return {
      companyId: input.companyId,
      search,
      status,
      customerId,
      fromDate: fromDateStr ? new Date(fromDateStr) : undefined,
      toDate: toDateStr ? new Date(toDateStr) : undefined,
      includePaid,
      overdueOnly,
      page: input.page ? Number(input.page) : undefined,
      pageSize: input.pageSize ? Number(input.pageSize) : undefined,
    };
  }
}
