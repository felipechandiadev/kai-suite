import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.debug(
      `[UserCreatedEvent] User ${event.aggregateId} created by ${event.userId}`,
    );

    try {
      // Audit logging
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.aggregateId,
          userId: event.userId,
          action: AuditActionType.CREATE,
        });
      }

      // Invalidate users cache
      if (this.cacheService) {
        await this.cacheService.del('users:all');
      }

      // TODO: Send welcome email
      // TODO: Create initial settings
      // TODO: Assign default permissions
    } catch (error) {
      this.logger.error(`Error handling UserCreatedEvent:`, error);
    }
  }
}
