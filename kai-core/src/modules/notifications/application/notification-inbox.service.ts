import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationDelivery } from '../domain/notification-delivery.entity';
import {
  NotificationDeliveryStatus,
  NotificationDomain,
} from '../domain/notification.enums';

export type InboxItemDto = {
  deliveryId: string;
  status: NotificationDeliveryStatus;
  deliveredAt: string;
  readAt: string | null;
  notification: {
    id: string;
    domain: NotificationDomain;
    kind: string;
    severity: string;
    title: string;
    body: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
  };
};

@Injectable()
export class NotificationInboxService {
  constructor(
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepo: Repository<NotificationDelivery>,
  ) {}

  async listInbox(params: {
    userId: string;
    companyId: string;
    domain?: NotificationDomain;
    status?: NotificationDeliveryStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: InboxItemDto[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const qb = this.deliveryRepo
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.notification', 'n')
      .where('d.userId = :userId', { userId: params.userId })
      .andWhere('d.companyId = :companyId', { companyId: params.companyId })
      .andWhere('d.deletedAt IS NULL');

    if (params.domain) {
      qb.andWhere('n.domain = :domain', { domain: params.domain });
    }
    if (params.status) {
      qb.andWhere('d.status = :status', { status: params.status });
    } else {
      qb.andWhere('d.status IN (:...statuses)', {
        statuses: [
          NotificationDeliveryStatus.UNREAD,
          NotificationDeliveryStatus.READ,
          NotificationDeliveryStatus.ARCHIVED,
        ],
      });
    }

    qb.orderBy('d.deliveredAt', 'DESC').skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((d) => this.toDto(d)),
      total,
    };
  }

  async getUnreadCount(
    userId: string,
    companyId: string,
    domain?: NotificationDomain,
  ): Promise<number> {
    const qb = this.deliveryRepo
      .createQueryBuilder('d')
      .innerJoin('d.notification', 'n')
      .where('d.userId = :userId', { userId })
      .andWhere('d.companyId = :companyId', { companyId })
      .andWhere('d.deletedAt IS NULL')
      .andWhere('d.status = :status', {
        status: NotificationDeliveryStatus.UNREAD,
      });

    if (domain) {
      qb.andWhere('n.domain = :domain', { domain });
    }

    return qb.getCount();
  }

  async markRead(deliveryId: string, userId: string, companyId: string) {
    const d = await this.findOwned(deliveryId, userId, companyId);
    if (d.status === NotificationDeliveryStatus.UNREAD) {
      d.status = NotificationDeliveryStatus.READ;
      d.readAt = new Date();
      await this.deliveryRepo.save(d);
    }
    const reloaded = await this.deliveryRepo.findOne({
      where: { id: d.id },
      relations: ['notification'],
    });
    return this.toDto(reloaded ?? d);
  }

  async markAllRead(userId: string, companyId: string, domain?: NotificationDomain) {
    const qb = this.deliveryRepo
      .createQueryBuilder()
      .update(NotificationDelivery)
      .set({
        status: NotificationDeliveryStatus.READ,
        readAt: () => 'NOW()',
        updatedAt: () => 'NOW()',
      })
      .where('userId = :userId', { userId })
      .andWhere('companyId = :companyId', { companyId })
      .andWhere('deletedAt IS NULL')
      .andWhere('status = :status', {
        status: NotificationDeliveryStatus.UNREAD,
      });

    if (domain) {
      qb.andWhere(
        `notification_id IN (SELECT id FROM notifications WHERE domain = :domain AND company_id = :companyId)`,
        { domain, companyId },
      );
    }

    await qb.execute();
    return { ok: true };
  }

  async dismiss(deliveryId: string, userId: string, companyId: string) {
    const d = await this.findOwned(deliveryId, userId, companyId);
    d.status = NotificationDeliveryStatus.DISMISSED;
    d.dismissedAt = new Date();
    d.deletedAt = new Date();
    await this.deliveryRepo.save(d);
    return { ok: true };
  }

  /**
   * Legacy shape for GET /inventory/threshold-alerts (stock alerts in inbox).
   */
  async listStockThresholdAlertsLegacy(
    userId: string,
    companyId: string,
    storageId?: string,
  ) {
    const { items } = await this.listInbox({
      userId,
      companyId,
      domain: NotificationDomain.STOCK,
      limit: 200,
    });
    const filtered = storageId
      ? items.filter(
          (i) =>
            (i.notification.payload as { storageId?: string })?.storageId ===
            storageId,
        )
      : items;
    return filtered.map((i) => {
      const p = i.notification.payload as {
        productVariantId?: string;
        storageId?: string;
        physicalStock?: number;
        availableStock?: number;
        transactionId?: string | null;
        alertKind?: string;
        alerts?: string[];
      };
      const alertKind = p.alertKind ?? p.alerts?.[0] ?? 'below_minimum';
      return {
        companyId,
        storageId: p.storageId ?? '',
        productVariantId: p.productVariantId ?? '',
        physicalStock: Number(p.physicalStock ?? 0),
        availableStock: Number(p.availableStock ?? 0),
        transactionId: p.transactionId ?? null,
        alerts: p.alerts ?? [alertKind],
      };
    });
  }

  private async findOwned(
    deliveryId: string,
    userId: string,
    companyId: string,
  ): Promise<NotificationDelivery> {
    const d = await this.deliveryRepo.findOne({
      where: {
        id: deliveryId,
        userId,
        companyId,
        deletedAt: IsNull(),
      },
      relations: ['notification'],
    });
    if (!d) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return d;
  }

  private toDto(d: NotificationDelivery): InboxItemDto {
    const n = d.notification!;
    return {
      deliveryId: d.id,
      status: d.status,
      deliveredAt: d.deliveredAt.toISOString(),
      readAt: d.readAt?.toISOString() ?? null,
      notification: {
        id: n.id,
        domain: n.domain,
        kind: n.kind,
        severity: n.severity,
        title: n.title,
        body: n.body,
        payload: n.payload,
        createdAt: n.createdAt.toISOString(),
      },
    };
  }
}
