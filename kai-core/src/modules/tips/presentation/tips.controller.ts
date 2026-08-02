import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { TipsService } from '../application/tips.service';
import { TipsPayoutService } from '../application/tips-payout.service';
import { TipLedgerStatus } from '../domain/tip-ledger-entry.entity';

@Controller('tips')
export class TipsController {
  constructor(
    private readonly tipsService: TipsService,
    private readonly tipsPayoutService: TipsPayoutService,
  ) {}

  @Get('ledger')
  async listLedger(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = this.tipsService.requireCompanyId();
    const entries = await this.tipsService.listEntries({
      companyId,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      status:
        status && Object.values(TipLedgerStatus).includes(status as TipLedgerStatus)
          ? (status as TipLedgerStatus)
          : undefined,
      employeeId: employeeId?.trim() || undefined,
      overdueOnly: overdueOnly === '1' || overdueOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
    return { success: true, data: entries };
  }

  @Get('summary')
  async summary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const companyId = this.tipsService.requireCompanyId();
    const data = await this.tipsService.summary({
      companyId,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
    });
    return { success: true, data };
  }

  @Get('overdue')
  async overdue() {
    const companyId = this.tipsService.requireCompanyId();
    const data = await this.tipsService.listOverdue(companyId);
    return { success: true, data };
  }

  @Get('balances')
  async balances() {
    const companyId = this.tipsService.requireCompanyId();
    const data = await this.tipsService.balancesByEmployee(companyId);
    return { success: true, data };
  }

  @Get('employee-open')
  async employeeOpen(@Query('employeeId') employeeId?: string) {
    const companyId = this.tipsService.requireCompanyId();
    const id = employeeId?.trim();
    if (!id) return { success: false, message: 'employeeId requerido' };
    const data = await this.tipsService.openAmountForEmployee(companyId, id);
    return { success: true, data };
  }

  @Post('attribute')
  async attribute(
    @Body()
    body?: {
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const companyId = this.tipsService.requireCompanyId();
    const data = await this.tipsService.attributeOpenTips({
      companyId,
      dateFrom: body?.dateFrom?.trim() || undefined,
      dateTo: body?.dateTo?.trim() || undefined,
    });
    return { success: true, data };
  }

  @Post('payout')
  async payout(
    @Body()
    body: {
      lines: Array<{ employeeId: string; amount?: number }>;
      paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK';
      companyBankAccountKey?: string | null;
      cashHubId?: string | null;
      notes?: string | null;
      branchId?: string | null;
    },
  ) {
    const data = await this.tipsPayoutService.createPayout({
      lines: body?.lines ?? [],
      paymentMethod: body?.paymentMethod,
      companyBankAccountKey: body?.companyBankAccountKey,
      cashHubId: body?.cashHubId,
      notes: body?.notes,
      branchId: body?.branchId,
    });
    return { success: true, data };
  }
}
