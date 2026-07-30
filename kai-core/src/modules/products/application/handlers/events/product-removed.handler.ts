import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { ProductRemovedEvent } from '../../../domain/events/product-removed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(ProductRemovedEvent)
export class ProductRemovedEventHandler implements IEventHandler<ProductRemovedEvent> {
  private readonly logger = new Logger(ProductRemovedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: ProductRemovedEvent): Promise<void> {
    this.logger.debug(`Product removed: ${event.aggregateId}`);

    try {
      // Audit Trail
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Product',
          entityId: event.aggregateId,
          action: AuditActionType.DELETE,
        });
      }

      // Invalidate caches
      if (this.cacheService) {
        await this.cacheService.del('products:all');
        await this.cacheService.del(`product:${event.aggregateId}`);
      }

      // TODO: Archive product data
      // TODO: Notify dependent services (variants, price lists)
      // TODO: Handle inventory cleanup
    } catch (error) {
      this.logger.error(`Error handling ProductRemovedEvent:`, error);
    }
  }
}
