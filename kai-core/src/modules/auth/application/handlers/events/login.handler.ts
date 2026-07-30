import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { LoginEvent } from '../../../domain/events/login.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(LoginEvent)
export class LoginEventHandler implements IEventHandler<LoginEvent> {
  private readonly logger = new Logger(LoginEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: LoginEvent): Promise<void> {
    this.logger.debug(
      `Login event: user ${event.userId} (${event.userName}) logged in with role ${event.userRole}`,
    );

    try {
      // Audit login event
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.userId,
          action: AuditActionType.LOGIN_SUCCESS,
          newValues: {
            role: event.userRole,
            timestamp: new Date(),
          },
        });
      }

      // Invalidate user cache
      if (this.cacheService) {
        await this.cacheService.set(
          `user:${event.userId}:last_login`,
          new Date().toISOString(),
          3600,
        );
      }

      // TODO: Update user's last login timestamp
      // TODO: Track login sessions
      // TODO: Send login notification to user
      // TODO: Check for suspicious login patterns
    } catch (error) {
      this.logger.error(`Error handling LoginEvent:`, error);
    }
  }
}
