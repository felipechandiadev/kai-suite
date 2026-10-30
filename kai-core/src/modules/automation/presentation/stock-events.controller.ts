import { Controller, Get, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { StockEventRetryService } from '../application/stock-event-retry.service';

@Controller('stock-events')
export class StockEventsController {
  constructor(private readonly retry: StockEventRetryService) {}

  /** Actualizaciones de stock que fallaron y siguen sin aplicarse. */
  @Get('failed')
  async failed(@CurrentCompany() companyId: string) {
    return this.retry.listFailed(companyId);
  }

  /** Reintenta ahora las actualizaciones fallidas de la empresa. */
  @Post('retry')
  async retryNow(@CurrentCompany() companyId: string) {
    return this.retry.retryFailed(companyId, { force: true });
  }
}
