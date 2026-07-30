import { Injectable } from '@nestjs/common';
import { WsStockTenantService } from '@modules/stock-realtime/ws-stock-tenant.service';

/** Reuses stock WS tenant resolution for notifications gateway auth. */
@Injectable()
export class WsNotificationsTenantService {
  constructor(private readonly stockTenant: WsStockTenantService) {}

  resolveSocketTenant(params: {
    userId: string | undefined;
    activeCompanyIdHeader: string | undefined;
  }) {
    return this.stockTenant.resolveSocketTenant(params);
  }
}
