import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { PasswordUpgradedEvent } from '../../../domain/events/password-upgraded.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@EventsHandler(PasswordUpgradedEvent)
export class PasswordUpgradedEventHandler implements IEventHandler<PasswordUpgradedEvent> {
  private readonly logger = new Logger(PasswordUpgradedEventHandler.name);

  constructor(
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async handle(event: PasswordUpgradedEvent): Promise<void> {
    this.logger.debug(
      `Password upgraded: user ${event.userId} password upgraded to bcrypt`,
    );

    try {
      // Audit security-sensitive operation
      if (this.auditService) {
        await this.auditService.logAudit({
          entityName: 'User',
          entityId: event.userId,
          action: AuditActionType.PASSWORD_CHANGE,
        });
      }

      // Invalidate session cache
      if (this.cacheService) {
        await this.cacheService.del(`user:${event.userId}:sessions`);
      }

      // TODO: Send notification to user about upgraded security
      // TODO: Schedule re-verification if needed
      // TODO: Update security profile metadata
    } catch (error) {
      this.logger.error(`Error handling PasswordUpgradedEvent:`, error);
    }
  }
}
