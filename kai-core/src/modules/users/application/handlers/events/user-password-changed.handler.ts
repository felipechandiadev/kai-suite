import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { UserPasswordChangedEvent } from '../../../domain/events/user-password-changed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(UserPasswordChangedEvent)
export class UserPasswordChangedEventHandler implements IEventHandler<UserPasswordChangedEvent> {
  private readonly logger = new Logger(UserPasswordChangedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: UserPasswordChangedEvent): Promise<void> {
    this.logger.debug(
      `[UserPasswordChangedEvent] Password changed for user ${event.aggregateId}`,
    );

    try {
      // Audit logging - security-sensitive operation
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.aggregateId,
          action: AuditActionType.PASSWORD_CHANGE,
        });
      }

      // Invalidate session cache for the user
      if (this.cacheService) {
        await this.cacheService.del(`user:${event.aggregateId}:sessions`);
      }

      // TODO: Revoke active sessions
      // TODO: Send notification email
    } catch (error) {
      this.logger.error(`Error handling UserPasswordChangedEvent:`, error);
    }
  }
}
