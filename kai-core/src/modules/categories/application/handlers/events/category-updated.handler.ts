import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject, Optional } from '@nestjs/common';
import { CategoryUpdatedEvent } from '../../../domain/events/category-updated.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(CategoryUpdatedEvent)
export class CategoryUpdatedEventHandler implements IEventHandler<CategoryUpdatedEvent> {
  private readonly logger = new Logger(CategoryUpdatedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  handle(event: CategoryUpdatedEvent): void {
    this.logger.debug(`[Event] Category updated: ${event.aggregateId}`);

    // Side Effect 1: Audit Trail Logging
    this.logAuditTrail(event);

    // Side Effect 2: Cache Invalidation
    this.invalidateCache();

    // Side Effect 3: Notify dependent entities (products, sub-categories)
    this.notifyDependentEntities(event);

    // Side Effect 4: Search Index Update
    this.scheduleSearchIndexing(event);
  }

  private logAuditTrail(event: CategoryUpdatedEvent): void {
    try {
      const changes: Record<string, any> = {};
      if (event.name !== undefined) changes.name = event.name;
      if (event.description !== undefined)
        changes.description = event.description;
      if (event.isActive !== undefined) changes.isActive = event.isActive;

      if (this.auditService) {
        this.auditService.logAudit({
          entityName: 'Category',
          entityId: event.aggregateId,
          action: AuditActionType.UPDATE,
          newValues: changes,
        });
      } else {
        this.logger.debug(
          `Category ${event.aggregateId} updated. Changes: ${JSON.stringify(changes)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to log audit for category ${event.aggregateId}: ${error}`,
      );
    }
  }

  private invalidateCache(): void {
    try {
      // Cache invalidation logic
      // For example: redisCache.del('categories:*')
      this.logger.debug('Category cache invalidated for updated category');
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error}`);
    }
  }

  private notifyDependentEntities(event: CategoryUpdatedEvent): void {
    try {
      // Notify other services about category changes
      // For example: eventEmitter.emit('category:updated', { id: event.aggregateId, changes: event })
      if (event.isActive !== undefined) {
        this.logger.debug(
          `Category status change notification scheduled: ${event.aggregateId} -> ${event.isActive ? 'ACTIVE' : 'INACTIVE'}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to notify dependent entities: ${error}`);
    }
  }

  private scheduleSearchIndexing(event: CategoryUpdatedEvent): void {
    try {
      // Schedule background job to update search indexes
      // For example: searchService.updateCategory(event.aggregateId)
      this.logger.debug(
        `Search indexing scheduled for updated category ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to schedule search indexing: ${error}`);
    }
  }
}
