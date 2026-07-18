import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationAudienceType,
  NotificationDomain,
  NotificationSeverity,
  NotificationSource,
  PricingNotificationKind,
} from '@modules/notifications/domain/notification.enums';
import { PublishNotificationCommand } from '@modules/notifications/application/dto/publish-notification.command';
import { NotificationPublisherService } from '@modules/notifications/application/notification-publisher.service';
import { UserRole } from '@modules/users/domain/user.entity';

/**
 * Publica una alerta coalescida de precios en el inbox (TopBar POS/admin).
 */
@Injectable()
export class PricingNotificationService {
  private readonly logger = new Logger(PricingNotificationService.name);

  constructor(
    private readonly notificationPublisher: NotificationPublisherService,
  ) {}

  async publishPriceUpdated(params: {
    companyId: string;
    variantId: string;
    priceListIds?: string[];
    productName?: string | null;
    actorUserId?: string | null;
  }): Promise<void> {
    if (!this.notificationPublisher.isPricingNotificationsEnabled()) {
      return;
    }

    const productLabel = params.productName?.trim() || 'Variante';
    const cmd = new PublishNotificationCommand();
    cmd.companyId = params.companyId;
    cmd.source = NotificationSource.AUTOMATION;
    cmd.domain = NotificationDomain.CATALOG;
    cmd.kind = PricingNotificationKind.UPDATED;
    cmd.severity = NotificationSeverity.INFO;
    cmd.title = 'Precios actualizados';
    cmd.body = `Se actualizó el precio de «${productLabel}». El menú POS se refrescará automáticamente.`;
    cmd.payload = {
      variantId: params.variantId,
      variantIds: [params.variantId],
      priceListIds: params.priceListIds ?? [],
      productName: productLabel,
      count: 1,
    };
    cmd.entityType = 'ProductVariant';
    cmd.entityId = params.variantId;
    // Coalesce: una sola alerta unread por empresa en la ventana de dedup
    cmd.groupKey = `pricing.updated:${params.companyId}`;
    cmd.actorUserId = params.actorUserId ?? null;
    cmd.audiences = [
      {
        audienceType: NotificationAudienceType.ROLES,
        audienceConfig: {
          roles: [UserRole.ADMIN, UserRole.POS_OPERATOR],
        },
      },
    ];

    try {
      await this.notificationPublisher.publish(cmd);
    } catch (e) {
      this.logger.warn(
        `Pricing notification failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
