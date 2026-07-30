import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { ProductCreatedEvent } from '../../../domain/events/product-created.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedEventHandler implements IEventHandler<ProductCreatedEvent> {
  private readonly logger = new Logger(ProductCreatedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: ProductCreatedEvent): Promise<void> {
    this.logger.debug(`Product created: ${event.aggregateId} (${event.name})`);

    try {
      // Side Effect 1: Log to audit trail
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Product',
          entityId: event.aggregateId,
          action: AuditActionType.CREATE,
          newValues: {
            name: event.name,
            sku: event.sku,
          },
        });
      }

      // Side Effect 2: Invalidate product cache
      if (this.cacheService) {
        await this.cacheService.del('products:all');
        await this.cacheService.del(`product:${event.aggregateId}`);
      }

      // TODO: Update search indexes
      // TODO: Send notifications to warehouse
      // TODO: Create initial stock records
    } catch (error) {
      this.logger.error(`Error handling ProductCreatedEvent:`, error);
    }
  }
}
