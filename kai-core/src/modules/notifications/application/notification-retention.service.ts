import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan, Repository } from 'typeorm';
import { Notification } from '../domain/notification.entity';
import { NotificationDelivery } from '../domain/notification-delivery.entity';
import { NotificationDeliveryStatus } from '../domain/notification.enums';

const DEFAULT_SWEEP_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DELIVERY_READ_PURGE_DAYS = 60;
const DEFAULT_DELIVERY_UNREAD_DISMISS_DAYS = 90;
const DEFAULT_NOTIFICATION_ORPHAN_PURGE_DAYS = 180;

@Injectable()
export class NotificationRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationRetentionService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepo: Repository<NotificationDelivery>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  onModuleInit() {
    const raw = process.env.NOTIFICATION_RETENTION_SWEEP_MS;
    const intervalMs =
      raw !== undefined && raw !== '' ? parseInt(raw, 10) : DEFAULT_SWEEP_MS;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log('Notification retention sweep disabled');
      return;
    }
    const firstDelay = Math.min(120_000, intervalMs);
    setTimeout(() => {
      void this.runRetention().catch((e) =>
        this.logger.warn(
          `Initial retention sweep failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }, firstDelay);
    this.interval = setInterval(() => {
      void this.runRetention().catch((e) =>
        this.logger.warn(
          `Retention sweep failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }, intervalMs);
    this.logger.log(`Notification retention sweep every ${intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async runRetention(): Promise<void> {
    const readDays = this.envInt(
      'NOTIFICATION_RETENTION_DELIVERY_READ_DAYS',
      DEFAULT_DELIVERY_READ_PURGE_DAYS,
    );
    const unreadDays = this.envInt(
      'NOTIFICATION_RETENTION_DELIVERY_UNREAD_DISMISS_DAYS',
      DEFAULT_DELIVERY_UNREAD_DISMISS_DAYS,
    );
    const orphanDays = this.envInt(
      'NOTIFICATION_RETENTION_NOTIFICATION_DAYS',
      DEFAULT_NOTIFICATION_ORPHAN_PURGE_DAYS,
    );

    const readCutoff = new Date(Date.now() - readDays * 86400000);
    const unreadCutoff = new Date(Date.now() - unreadDays * 86400000);
    const orphanCutoff = new Date(Date.now() - orphanDays * 86400000);

    const autoDismissed = await this.deliveryRepo.update(
      {
        status: NotificationDeliveryStatus.UNREAD,
        deletedAt: IsNull(),
        deliveredAt: LessThan(unreadCutoff),
      },
      {
        status: NotificationDeliveryStatus.DISMISSED,
        dismissedAt: new Date(),
        deletedAt: new Date(),
      },
    );

    const purgedRead = await this.dataSource.query(
      `DELETE FROM notification_deliveries
       WHERE deleted_at IS NOT NULL
         AND (
           (status IN ('READ', 'ARCHIVED') AND read_at IS NOT NULL AND read_at < $1)
           OR (status = 'DISMISSED' AND dismissed_at IS NOT NULL AND dismissed_at < $1)
           OR (deleted_at < $1)
         )`,
      [readCutoff],
    );

    const purgedOrphans = await this.dataSource.query(
      `DELETE FROM notifications n
       WHERE n.created_at < $1
         AND NOT EXISTS (
           SELECT 1 FROM notification_deliveries d
           WHERE d.notification_id = n.id AND d.deleted_at IS NULL
         )`,
      [orphanCutoff],
    );

    const dismissed = autoDismissed.affected ?? 0;
    const deletedDeliveries = purgedRead?.[1] ?? 0;
    const deletedNotifications = purgedOrphans?.[1] ?? 0;

    if (dismissed > 0 || deletedDeliveries > 0 || deletedNotifications > 0) {
      this.logger.debug(
        `Retention: dismissed ${dismissed} stale unread, purged ${deletedDeliveries} deliveries, ${deletedNotifications} orphan notifications`,
      );
    }
  }

  private envInt(key: string, fallback: number): number {
    const raw = process.env[key];
    if (raw === undefined || raw === '') return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}
