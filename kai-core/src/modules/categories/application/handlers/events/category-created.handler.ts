import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { CategoryCreatedEvent } from '../../../domain/events/category-created.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(CategoryCreatedEvent)
export class CategoryCreatedEventHandler implements IEventHandler<CategoryCreatedEvent> {
  private readonly logger = new Logger(CategoryCreatedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: CategoryCreatedEvent): Promise<void> {
    this.logger.debug(
      `[Event] Category created: ${event.aggregateId} | Name: ${event.name}`,
    );

    try {
      // Side Effect 1: Audit Trail Logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Category',
          entityId: event.aggregateId,
          action: AuditActionType.CREATE,
          newValues: {
            name: event.name,
            code: event.code,
          },
        });
      }

      // Side Effect 2: Invalidate category cache
      if (this.cacheService) {
        await this.cacheService.del('categories:all');
      }

      // TODO: Update search indexes
      // TODO: Send notifications
    } catch (error) {
      this.logger.error(`Error handling CategoryCreatedEvent:`, error);
    }
  }
}
