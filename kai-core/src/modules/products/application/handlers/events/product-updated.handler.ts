import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedEventHandler implements IEventHandler<ProductUpdatedEvent> {
  private readonly logger = new Logger(ProductUpdatedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: ProductUpdatedEvent): Promise<void> {
    this.logger.debug(`Product updated: ${event.aggregateId}`);

    try {
      // Audit Trail
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Product',
          entityId: event.aggregateId,
          action: AuditActionType.UPDATE,
        });
      }

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.del('products:all');
        await this.cacheService.del(`product:${event.aggregateId}`);
      }

      // TODO: Update search indexes
      // TODO: Notify related services (pricing, inventory)
      // TODO: Update price list items if needed
    } catch (error) {
      this.logger.error(`Error handling ProductUpdatedEvent:`, error);
    }
  }
}
