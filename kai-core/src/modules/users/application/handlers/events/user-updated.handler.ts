import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { UserUpdatedEvent } from '../../../domain/events/user-updated.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(UserUpdatedEvent)
export class UserUpdatedEventHandler implements IEventHandler<UserUpdatedEvent> {
  private readonly logger = new Logger(UserUpdatedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: UserUpdatedEvent): Promise<void> {
    this.logger.debug(
      `[UserUpdatedEvent] User ${event.aggregateId} updated by ${event.userId}`,
    );

    try {
      // Audit logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.aggregateId,
          userId: event.userId,
          action: AuditActionType.UPDATE,
        });
      }

      // Invalidate caches
      if (this.cacheService) {
        await this.cacheService.del('users:all');
        await this.cacheService.del(`user:${event.aggregateId}`);
      }

      // TODO: Send notifications
    } catch (error) {
      this.logger.error(`Error handling UserUpdatedEvent:`, error);
    }
  }
}
