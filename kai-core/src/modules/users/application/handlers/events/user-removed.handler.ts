import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { UserRemovedEvent } from '../../../domain/events/user-removed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(UserRemovedEvent)
export class UserRemovedEventHandler implements IEventHandler<UserRemovedEvent> {
  private readonly logger = new Logger(UserRemovedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: UserRemovedEvent): Promise<void> {
    this.logger.debug(
      `[UserRemovedEvent] User ${event.aggregateId} removed by ${event.userId}, reason: ${event.reason || 'unspecified'}`,
    );

    try {
      // Audit logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.aggregateId,
          userId: event.userId,
          action: AuditActionType.DELETE,
        });
      }

      // Invalidate caches
      if (this.cacheService) {
        await this.cacheService.del('users:all');
        await this.cacheService.del(`user:${event.aggregateId}`);
      }

      // TODO: Revoke sensitive access
      // TODO: Archive user data
      // TODO: Cleanup related records
    } catch (error) {
      this.logger.error(`Error handling UserRemovedEvent:`, error);
    }
  }
}
