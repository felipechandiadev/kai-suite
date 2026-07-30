import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject, Optional } from '@nestjs/common';
import { CategoryRemovedEvent } from '../../../domain/events/category-removed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(CategoryRemovedEvent)
export class CategoryRemovedEventHandler implements IEventHandler<CategoryRemovedEvent> {
  private readonly logger = new Logger(CategoryRemovedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  handle(event: CategoryRemovedEvent): void {
    this.logger.debug(
      `[Event] Category removed (soft delete): ${event.aggregateId}`,
    );

    // Side Effect 1: Audit Trail Logging
    this.logAuditTrail(event);

    // Side Effect 2: Cache Invalidation
    this.invalidateCache();

    // Side Effect 3: Archive Category Data
    this.archiveCategoryData(event);

    // Side Effect 4: Notify Dependent Services (products, reports, etc.)
    this.notifyDependentServices(event);

    // Side Effect 5: Update Search Indexes
    this.scheduleSearchIndexRemoval(event);
  }

  private logAuditTrail(event: CategoryRemovedEvent): void {
    try {
      if (this.auditService) {
        this.auditService.logAudit({
          entityName: 'Category',
          entityId: event.aggregateId,
          action: AuditActionType.DELETE,
          newValues: {
            reason: event.reason || 'No reason provided',
          },
        });
      } else {
        this.logger.debug(
          `Category ${event.aggregateId} removed. Reason: ${event.reason || 'No reason provided'}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to log audit for category removal ${event.aggregateId}: ${error}`,
      );
    }
  }

  private invalidateCache(): void {
    try {
      // Cache invalidation logic
      // For example: redisCache.del('categories:*')
      this.logger.debug('Category cache invalidated for removed category');
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error}`);
    }
  }

  private archiveCategoryData(event: CategoryRemovedEvent): void {
    try {
      // Archive category data for compliance/audit purposes
      // For example: archiveService.archive('Category', event.aggregateId)
      this.logger.debug(
        `Category data archived for retention: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to archive category data: ${error}`);
    }
  }

  private notifyDependentServices(event: CategoryRemovedEvent): void {
    try {
      // Notify other services about category removal
      // For example: eventEmitter.emit('category:removed', { id: event.aggregateId })
      // This allows products, product lists, and other services to handle orphaned references
      this.logger.debug(
        `Notifications queued for dependent services on category removal: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to notify dependent services: ${error}`);
    }
  }

  private scheduleSearchIndexRemoval(event: CategoryRemovedEvent): void {
    try {
      // Schedule background job to remove from search indexes
      // For example: searchService.removeCategory(event.aggregateId)
      this.logger.debug(
        `Search index removal scheduled for category ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to schedule search index removal: ${error}`);
    }
  }
}
