import { Controller, Get, Query } from '@nestjs/common';
import { TipsService } from '../application/tips.service';
import { TipLedgerStatus } from '../domain/tip-ledger-entry.entity';

@Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Get('ledger')
  async listLedger(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
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
}
