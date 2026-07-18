import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { Notification } from '../domain/notification.entity';
import { NotificationDelivery } from '../domain/notification-delivery.entity';
import { NotificationAudience } from '../domain/notification-audience.entity';
import {
  NotificationDeliveryStatus,
  NotificationDomain,
} from '../domain/notification.enums';
import type { PublishNotificationCommand } from './dto/publish-notification.command';
import { AudienceResolverService } from './audience-resolver.service';
import { NotificationsRealtimePublisher } from './notifications-realtime.publisher';
import type { NotificationDeliveryWsPayload } from './notification-realtime.types';
import { NotificationRetentionPolicy } from '../domain/notification-retention-policy.entity';

@Injectable()
export class NotificationPublisherService {
  private readonly logger = new Logger(NotificationPublisherService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationRetentionPolicy)
    private readonly retentionPolicyRepo: Repository<NotificationRetentionPolicy>,
    private readonly audienceResolver: AudienceResolverService,
    private readonly realtime: NotificationsRealtimePublisher,
  ) {}

  isStockNotificationsEnabled(): boolean {
    const raw = process.env.NOTIFICATIONS_STOCK_ENABLED;
    if (raw === undefined || raw === '') return true;
    return raw === 'true' || raw === '1';
  }

  isPricingNotificationsEnabled(): boolean {
    const raw = process.env.NOTIFICATIONS_PRICING_ENABLED;
    if (raw === undefined || raw === '') return true;
    return raw === 'true' || raw === '1';
  }

  async publish(cmd: PublishNotificationCommand): Promise<NotificationDelivery[]> {
    if (
      cmd.domain === NotificationDomain.STOCK &&
      !this.isStockNotificationsEnabled()
    ) {
      return [];
    }
    if (
      cmd.domain === NotificationDomain.CATALOG &&
      !this.isPricingNotificationsEnabled()
    ) {
      return [];
    }

    const userIds = await this.audienceResolver.resolveUserIds(
      cmd.companyId,
      cmd.audiences,
      cmd.domain,
    );
    if (userIds.length === 0) {
      if (cmd.domain === NotificationDomain.STOCK) {
        this.logger.warn(
          `Notificación de stock sin destinatarios ADMIN (companyId=${cmd.companyId})`,
        );
      }
      return [];
    }

    const dedupMinutes = await this.getDedupWindowMinutes(cmd.companyId, cmd.domain);
    const now = new Date();

    const result = await this.dataSource.transaction(async (manager) => {
      const notifRepo = manager.getRepository(Notification);
      const deliveryRepo = manager.getRepository(NotificationDelivery);
      const audienceRepo = manager.getRepository(NotificationAudience);

      let notification: Notification | null = null;

      if (cmd.groupKey) {
        const since = new Date(now.getTime() - dedupMinutes * 60 * 1000);
        notification = await notifRepo.findOne({
          where: {
            companyId: cmd.companyId,
            groupKey: cmd.groupKey,
            createdAt: MoreThan(since),
          },
          order: { createdAt: 'DESC' },
        });
      }

      if (notification) {
        const prevPayload =
          notification.payload && typeof notification.payload === 'object'
            ? (notification.payload as Record<string, unknown>)
            : {};
        let nextPayload = cmd.payload;
        if (cmd.domain === NotificationDomain.CATALOG && cmd.kind === 'pricing.updated') {
          const prevIds = Array.isArray(prevPayload.variantIds)
            ? prevPayload.variantIds.map((x) => String(x))
            : [];
          const nextIds = Array.isArray(cmd.payload.variantIds)
            ? cmd.payload.variantIds.map((x) => String(x))
            : [];
          const mergedIds = [...new Set([...prevIds, ...nextIds])];
          nextPayload = {
            ...cmd.payload,
            variantIds: mergedIds,
            count: mergedIds.length,
          };
          cmd.title = 'Precios actualizados';
          cmd.body =
            mergedIds.length > 1
              ? `Se actualizaron precios de ${mergedIds.length} variantes. El menú POS se refrescará automáticamente.`
              : cmd.body;
        }
        notification.title = cmd.title;
        notification.body = cmd.body ?? null;
        notification.severity = cmd.severity;
        notification.payload = nextPayload;
        notification.updatedAt = now;
        await notifRepo.save(notification);
      } else {
        notification = notifRepo.create({
          companyId: cmd.companyId,
          source: cmd.source,
          domain: cmd.domain,
          kind: cmd.kind,
          severity: cmd.severity,
          title: cmd.title,
          body: cmd.body ?? null,
          payload: cmd.payload,
          entityType: cmd.entityType ?? null,
          entityId: cmd.entityId ?? null,
          groupKey: cmd.groupKey ?? null,
          actorUserId: cmd.actorUserId ?? null,
        });
        await notifRepo.save(notification);

        for (const aud of cmd.audiences) {
          await audienceRepo.save(
            audienceRepo.create({
              notificationId: notification.id,
              audienceType: aud.audienceType,
              audienceConfig: aud.audienceConfig,
            }),
          );
        }
      }

      const deliveries: NotificationDelivery[] = [];

      for (const userId of userIds) {
        let delivery = await deliveryRepo.findOne({
          where: {
            notificationId: notification.id,
            userId,
            deletedAt: IsNull(),
          },
        });

        if (delivery) {
          // Re-alert: misma group_key en ventana de dedup → reabrir como UNREAD
          // (si quedó READ, el admin no la veía de nuevo por WS ni inbox).
          delivery.status = NotificationDeliveryStatus.UNREAD;
          delivery.readAt = null;
          delivery.dismissedAt = null;
          delivery.deliveredAt = now;
          delivery.updatedAt = now;
          await deliveryRepo.save(delivery);
        } else {
          delivery = deliveryRepo.create({
            notificationId: notification.id,
            companyId: cmd.companyId,
            userId,
            status: NotificationDeliveryStatus.UNREAD,
            deliveredAt: now,
          });
          await deliveryRepo.save(delivery);
        }
        deliveries.push(delivery);
      }

      return { notification, deliveries };
    });

    this.emitDeliveries(result.notification, result.deliveries);
    return result.deliveries;
  }

  private emitDeliveries(
    notification: Notification,
    deliveries: NotificationDelivery[],
  ) {
    if (deliveries.length === 0) return;

    for (const d of deliveries) {
      const ws: NotificationDeliveryWsPayload = {
        deliveryId: d.id,
        companyId: d.companyId,
        userId: d.userId,
        status: d.status,
        deliveredAt: d.deliveredAt.toISOString(),
        notification: {
          id: notification.id,
          domain: notification.domain,
          kind: notification.kind,
          severity: notification.severity,
          title: notification.title,
          body: notification.body,
          payload: notification.payload,
          createdAt: notification.createdAt.toISOString(),
        },
      };
      this.realtime.emitDelivery(ws);
    }
  }

  private async getDedupWindowMinutes(
    companyId: string,
    domain: NotificationDomain,
  ): Promise<number> {
    const policy = await this.retentionPolicyRepo
      .createQueryBuilder('p')
      .where('p.domain = :domain', { domain })
      .andWhere('(p.company_id = :companyId OR p.company_id IS NULL)', {
        companyId,
      })
      .orderBy('p.company_id', 'DESC', 'NULLS LAST')
      .getOne();
    if (policy?.dedupWindowMinutes != null) {
      return policy.dedupWindowMinutes;
    }
    const env = process.env.NOTIFICATION_DEDUP_WINDOW_MINUTES;
    const parsed = env ? parseInt(env, 10) : 15;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
  }
}
