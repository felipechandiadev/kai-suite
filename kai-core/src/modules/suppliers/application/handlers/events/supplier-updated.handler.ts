import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject, Optional } from '@nestjs/common';
import { SupplierUpdatedEvent } from '../../../domain/events/supplier-updated.event';

@EventsHandler(SupplierUpdatedEvent)
export class SupplierUpdatedEventHandler implements IEventHandler<SupplierUpdatedEvent> {
  private readonly logger = new Logger(SupplierUpdatedEventHandler.name);

  constructor(
    @Optional()
    @Inject('AUDIT_SERVICE')
    private readonly auditService?: any,

    @Optional()
    @Inject('CACHE_SERVICE')
    private readonly cacheService?: any,
  ) {}

  async handle(event: SupplierUpdatedEvent): Promise<void> {
    if (!event.aggregateId) {
      this.logger.warn(
        '[SupplierUpdatedEvent] Missing aggregateId, skipping event handling',
      );
      return;
    }

    this.logger.debug(
      `[SupplierUpdatedEvent] Handling supplier update: ${event.aggregateId}`,
    );

    try {
      // Audit logging with change tracking
      await this.logAuditTrail(event);

      // Cache invalidation side effect
      await this.invalidateSupplierCache(event.aggregateId);

      this.logger.debug(
        `[SupplierUpdatedEvent] Successfully completed side effects for supplier ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierUpdatedEvent] Error handling supplier update: ${error.message}`,
        error.stack,
      );
      // Don't rethrow - side effects should not fail the main transaction
    }
  }

  private async logAuditTrail(event: SupplierUpdatedEvent): Promise<void> {
    if (!this.auditService) {
      this.logger.warn('[SupplierUpdatedEvent] AuditService not available');
      return;
    }

    try {
      const changedFields: string[] = [];
      const newValues: Record<string, any> = {};

      if (event.supplierType !== undefined) {
        changedFields.push('supplierType');
        newValues.supplierType = event.supplierType;
      }
      if (event.alias !== undefined) {
        changedFields.push('alias');
        newValues.alias = event.alias;
      }
      if (event.defaultPaymentTermDays !== undefined) {
        changedFields.push('defaultPaymentTermDays');
        newValues.defaultPaymentTermDays = event.defaultPaymentTermDays;
      }
      if (event.isActive !== undefined) {
        changedFields.push('isActive');
        newValues.isActive = event.isActive;
      }
      if (event.notes !== undefined) {
        changedFields.push('notes');
        newValues.notes = event.notes;
      }

      const auditLog = {
        entityName: 'Supplier',
        entityId: event.aggregateId,
        action: 'UPDATE',
        userId: event.userId,
        newValues: Object.keys(newValues).length > 0 ? newValues : undefined,
        metadata: {
          correlationId: event.correlationId,
          occurredAt: event.occurredAt,
          changedFields,
        },
      };

      await this.auditService.logAudit(auditLog);
      this.logger.debug(
        `[SupplierUpdatedEvent] Audit trail logged for supplier ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierUpdatedEvent] Failed to log audit trail: ${error.message}`,
      );
      // Silently continue - audit failure should not block event handling
    }
  }

  private async invalidateSupplierCache(supplierId: string): Promise<void> {
    if (!this.cacheService) {
      this.logger.warn('[SupplierUpdatedEvent] CacheService not available');
      return;
    }

    try {
      // Invalidate all supplier-related cache keys
      await Promise.all([
        this.cacheService.del(`supplier:${supplierId}`),
        this.cacheService.del('suppliers:all'),
        this.cacheService.del('suppliers:active'),
        this.cacheService.del('suppliers:filters'),
      ]);

      this.logger.debug(
        `[SupplierUpdatedEvent] Cache invalidated for supplier ${supplierId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SupplierUpdatedEvent] Failed to invalidate cache: ${error.message}`,
      );
      // Silently continue - cache failure should not block event handling
    }
  }
}
