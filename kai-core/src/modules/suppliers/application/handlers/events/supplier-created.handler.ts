import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject, Optional } from '@nestjs/common';
import { SupplierCreatedEvent } from '../../../domain/events/supplier-created.event';

@EventsHandler(SupplierCreatedEvent)
export class SupplierCreatedEventHandler implements IEventHandler<SupplierCreatedEvent> {
  private readonly logger = new Logger(SupplierCreatedEventHandler.name);

  constructor(
    @Optional()
    @Inject('AUDIT_SERVICE')
    private readonly auditService?: any,

    @Optional()
    @Inject('CACHE_SERVICE')
    private readonly cacheService?: any,
  ) {}

  async handle(event: SupplierCreatedEvent): Promise<void> {
    if (!event.aggregateId) {
      this.logger.warn(
        '[SupplierCreatedEvent] Missing aggregateId, skipping event handling',
      );
      return;
    }

    this.logger.debug(
      `[SupplierCreatedEvent] Handling supplier creation: ${event.aggregateId}`,
    );

    try {
      // Audit logging side effect
      await this.logAuditTrail(event);

      // Cache invalidation side effect
      await this.invalidateSupplierCache();

      this.logger.debug(
        `[SupplierCreatedEvent] Successfully completed side effects for supplier ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierCreatedEvent] Error handling supplier creation: ${error.message}`,
        error.stack,
      );
      // Don't rethrow - side effects should not fail the main transaction
    }
  }

  private async logAuditTrail(event: SupplierCreatedEvent): Promise<void> {
    if (!this.auditService) {
      this.logger.warn('[SupplierCreatedEvent] AuditService not available');
      return;
    }

    try {
      const auditLog = {
        entityName: 'Supplier',
        entityId: event.aggregateId,
        action: 'CREATE',
        userId: event.userId,
        newValues: {
          personId: event.personId,
          supplierType: event.supplierType,
          defaultPaymentTermDays: event.defaultPaymentTermDays,
          alias: event.alias,
          isActive: event.isActive,
        },
        metadata: {
          correlationId: event.correlationId,
          occurredAt: event.occurredAt,
        },
      };

      await this.auditService.logAudit(auditLog);
      this.logger.debug(
        `[SupplierCreatedEvent] Audit trail logged for supplier ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierCreatedEvent] Failed to log audit trail: ${error.message}`,
      );
      // Silently continue - audit failure should not block event handling
    }
  }

  private async invalidateSupplierCache(): Promise<void> {
    if (!this.cacheService) {
      this.logger.warn('[SupplierCreatedEvent] CacheService not available');
      return;
    }

    try {
      // Invalidate all supplier-related cache keys
      await Promise.all([
        this.cacheService.del('suppliers:all'),
        this.cacheService.del('suppliers:active'),
        this.cacheService.del('suppliers:filters'),
      ]);

      this.logger.debug('[SupplierCreatedEvent] Supplier cache invalidated');
    } catch (error) {
      this.logger.error(
        `[SupplierCreatedEvent] Failed to invalidate cache: ${error.message}`,
      );
      // Silently continue - cache failure should not block event handling
    }
  }
}
