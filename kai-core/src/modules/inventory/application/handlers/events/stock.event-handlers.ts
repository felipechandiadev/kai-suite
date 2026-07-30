import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Optional, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  StockAdjustedEvent,
  StockTransferredEvent,
  PMPRecalculatedEvent,
} from '@modules/inventory/domain/events/stock-adjusted.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(StockAdjustedEvent)
export class StockAdjustedEventHandler implements IEventHandler<StockAdjustedEvent> {
  private readonly logger = new Logger(StockAdjustedEventHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: StockAdjustedEvent): Promise<void> {
    const eventData = {
      variantId: event.variantId,
      storageId: event.storageId,
      diff: event.diff,
      adjustmentType: event.adjustmentType,
    };

    try {
      // Log to standard logger
      this.logger.debug('StockAdjustedEvent:', eventData);

      // Audit trail logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Stock',
          entityId: event.variantId,
          action: AuditActionType.UPDATE,
          newValues: eventData,
        });
      }

      // Invalidate cache for variant and storage
      if (this.cacheService) {
        await this.cacheService.del(`stock:${event.variantId}`);
        await this.cacheService.del(`storage:${event.storageId}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle stock adjustment event:', error);
    }
  }
}

@EventsHandler(StockTransferredEvent)
export class StockTransferredEventHandler implements IEventHandler<StockTransferredEvent> {
  private readonly logger = new Logger(StockTransferredEventHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: StockTransferredEvent): Promise<void> {
    const eventData = {
      variantId: event.variantId,
      sourceStorageId: event.sourceStorageId,
      targetStorageId: event.targetStorageId,
      quantity: event.quantity,
    };

    try {
      this.logger.debug('StockTransferredEvent:', eventData);

      // Audit trail logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Stock',
          entityId: event.variantId,
          action: AuditActionType.UPDATE,
          newValues: eventData,
        });
      }

      // Invalidate cache for both source and target storages
      if (this.cacheService) {
        await this.cacheService.del(`stock:${event.variantId}`);
        await this.cacheService.del(`storage:${event.sourceStorageId}`);
        await this.cacheService.del(`storage:${event.targetStorageId}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle stock transfer event:', error);
    }
  }
}

@EventsHandler(PMPRecalculatedEvent)
export class PMPRecalculatedEventHandler implements IEventHandler<PMPRecalculatedEvent> {
  private readonly logger = new Logger(PMPRecalculatedEventHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: PMPRecalculatedEvent): Promise<void> {
    const eventData = {
      variantId: event.variantId,
      storageId: event.storageId,
      previousPmp: event.previousPmp,
      newPmp: event.newPmp,
    };

    try {
      this.logger.debug('PMPRecalculatedEvent:', eventData);

      // Audit trail logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'Stock',
          entityId: event.variantId,
          action: AuditActionType.UPDATE,
          oldValues: { pmp: event.previousPmp },
          newValues: { pmp: event.newPmp },
        });
      }

      // Invalidate relevant caches
      if (this.cacheService) {
        await this.cacheService.del(`stock:${event.variantId}`);
        await this.cacheService.del(`pmp:${event.variantId}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle PMP recalculation event:', error);
    }
  }
}
