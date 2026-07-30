import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject, Optional } from '@nestjs/common';
import { SupplierRemovedEvent } from '../../../domain/events/supplier-removed.event';

@EventsHandler(SupplierRemovedEvent)
export class SupplierRemovedEventHandler implements IEventHandler<SupplierRemovedEvent> {
  private readonly logger = new Logger(SupplierRemovedEventHandler.name);

  constructor(
    @Optional()
    @Inject('AUDIT_SERVICE')
    private readonly auditService?: any,

    @Optional()
    @Inject('CACHE_SERVICE')
    private readonly cacheService?: any,
  ) {}

  async handle(event: SupplierRemovedEvent): Promise<void> {
    if (!event.aggregateId) {
      this.logger.warn(
        '[SupplierRemovedEvent] Missing aggregateId, skipping event handling',
      );
      return;
    }

    this.logger.debug(
      `[SupplierRemovedEvent] Handling supplier removal: ${event.aggregateId}`,
    );

    try {
      // Audit logging side effect
      await this.logAuditTrail(event);

      // Cache invalidation side effect
      await this.invalidateSupplierCache();

      this.logger.debug(
        `[SupplierRemovedEvent] Successfully completed side effects for supplier ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierRemovedEvent] Error handling supplier removal: ${error.message}`,
        error.stack,
      );
      // Don't rethrow - side effects should not fail the main transaction
    }
  }

  private async logAuditTrail(event: SupplierRemovedEvent): Promise<void> {
    if (!this.auditService) {
      this.logger.warn('[SupplierRemovedEvent] AuditService not available');
      return;
    }

    try {
      const auditLog = {
        entityName: 'Supplier',
        entityId: event.aggregateId,
        action: 'DELETE',
        userId: event.userId,
        newValues: null,
        metadata: {
          correlationId: event.correlationId,
          occurredAt: event.occurredAt,
          reason: event.reason || 'Not specified',
        },
      };

      await this.auditService.logAudit(auditLog);
      this.logger.debug(
        `[SupplierRemovedEvent] Audit trail logged for removed supplier ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierRemovedEvent] Failed to log audit trail: ${error.message}`,
      );
      // Silently continue - audit failure should not block event handling
    }
  }

  private async invalidateSupplierCache(): Promise<void> {
    if (!this.cacheService) {
      this.logger.warn('[SupplierRemovedEvent] CacheService not available');
      return;
    }

    try {
      // Invalidate all supplier-related cache keys
      await Promise.all([
        this.cacheService.del('suppliers:all'),
        this.cacheService.del('suppliers:active'),
        this.cacheService.del('suppliers:filters'),
      ]);

      this.logger.debug('[SupplierRemovedEvent] Supplier cache invalidated');
    } catch (error) {
      this.logger.error(
        `[SupplierRemovedEvent] Failed to invalidate cache: ${error.message}`,
      );
      // Silently continue - cache failure should not block event handling
    }
  }
}
