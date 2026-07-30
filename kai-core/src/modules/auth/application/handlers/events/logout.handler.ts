import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { LogoutEvent } from '../../../domain/events/logout.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(LogoutEvent)
export class LogoutEventHandler implements IEventHandler<LogoutEvent> {
  private readonly logger = new Logger(LogoutEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: LogoutEvent): Promise<void> {
    this.logger.debug(`Logout event: user ${event.userId} logged out`);

    try {
      // Audit logout event
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.userId,
          action: AuditActionType.LOGOUT,
        });
      }

      // Invalidate session cache
      if (this.cacheService) {
        await this.cacheService.del(`user:${event.userId}:sessions`);
      }

      // TODO: Invalidate active sessions/tokens
      // TODO: Update user's last logout timestamp
      // TODO: Clean up temporary session data
      // TODO: Send logout notification
    } catch (error) {
      this.logger.error(`Error handling LogoutEvent:`, error);
    }
  }
}
