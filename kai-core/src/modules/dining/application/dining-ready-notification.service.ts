import { Injectable, Logger } from '@nestjs/common';
import {
  DiningNotificationKind,
  NotificationAudienceType,
  NotificationDomain,
  NotificationSeverity,
  NotificationSource,
} from '@modules/notifications/domain/notification.enums';
import { PublishNotificationCommand } from '@modules/notifications/application/dto/publish-notification.command';
import { NotificationPublisherService } from '@modules/notifications/application/notification-publisher.service';
import { UserRole } from '@modules/users/domain/user.entity';
import type { DiningOrder } from '../domain/dining-order.entity';
import type { DiningOrderLine } from '../domain/dining-order-line.entity';
import { kitchenVariantLabel } from './dining-kitchen-line.util';

export type KitchenReadyItemSummary = {
  lineIds: string[];
  productVariantId: string;
  name: string;
  quantity: number;
  notes: string | null;
};

/**
 * Publica alertas de cocina lista al inbox POS (campana TopBar) + Web Push.
 * Separa ítem listo vs pedido (fire+UP) listo.
 */
@Injectable()
export class DiningReadyNotificationService {
  private readonly logger = new Logger(DiningReadyNotificationService.name);

  constructor(
    private readonly notificationPublisher: NotificationPublisherService,
  ) {}

  /**
   * Agrupa líneas por variant+notes para el payload/body de la campana.
   */
  buildKitchenItemSummaries(
    lines: Array<
      Pick<DiningOrderLine, 'id' | 'productVariantId' | 'quantity' | 'notes'> & {
        productVariant?: DiningOrderLine['productVariant'];
      }
    >,
  ): KitchenReadyItemSummary[] {
    const map = new Map<string, KitchenReadyItemSummary>();
    for (const line of lines) {
      const notes = (line.notes ?? '').trim() || null;
      const key = `${line.productVariantId}|${notes ?? ''}`;
      const qty = Number(line.quantity) || 0;
      const name =
        kitchenVariantLabel(line.productVariant) || 'Producto';
      const existing = map.get(key);
      if (existing) {
        existing.lineIds.push(line.id);
        existing.quantity += qty;
        continue;
      }
      map.set(key, {
        lineIds: [line.id],
        productVariantId: line.productVariantId,
        name,
        quantity: qty,
        notes,
      });
    }
    return [...map.values()];
  }

  formatItemReadyBody(items: KitchenReadyItemSummary[]): string {
    return items
      .map((it) => {
        const base = `${formatQty(it.quantity)}× ${it.name}`;
        return it.notes ? `${base} · ${it.notes}` : base;
      })
      .join(' · ');
  }

  formatOrderReadyBody(items: KitchenReadyItemSummary[]): string {
    return items
      .map((it) => {
        const base = `• ${formatQty(it.quantity)}× ${it.name}`;
        return it.notes ? `${base} · ${it.notes}` : base;
      })
      .join('\n');
  }

  async publishItemReady(params: {
    companyId: string;
    order: DiningOrder;
    productionUnitId: string;
    fireId: string;
    fireNumber?: number | null;
    items: KitchenReadyItemSummary[];
    actorUserId?: string | null;
    sentByUserId?: string | null;
  }): Promise<void> {
    const label = params.order.displayLabel?.trim() || 'Cuenta';
    const items = params.items;
    const lineCount = items.reduce((s, it) => s + it.quantity, 0) || 1;
    const notesKey = items.map((i) => `${i.productVariantId}|${i.notes ?? ''}`).join(',');
    const groupKey = `dining.item_ready:${params.fireId}:${params.productionUnitId}:${notesKey}`;

    await this.publish({
      companyId: params.companyId,
      order: params.order,
      kind: DiningNotificationKind.ITEM_READY,
      title: `Ítem listo: ${label}`,
      body: this.formatItemReadyBody(items) || 'Ítem listo',
      groupKey,
      productionUnitId: params.productionUnitId,
      fireId: params.fireId,
      fireNumber: params.fireNumber ?? null,
      items,
      lineCount,
      actorUserId: params.actorUserId ?? null,
      sentByUserId: params.sentByUserId ?? null,
    });
  }

  async publishOrderReady(params: {
    companyId: string;
    order: DiningOrder;
    productionUnitId: string;
    fireId: string;
    fireNumber?: number | null;
    items: KitchenReadyItemSummary[];
    actorUserId?: string | null;
    sentByUserId?: string | null;
  }): Promise<void> {
    const label = params.order.displayLabel?.trim() || 'Cuenta';
    const fireN =
      typeof params.fireNumber === 'number' &&
      Number.isFinite(params.fireNumber) &&
      params.fireNumber > 0
        ? params.fireNumber
        : null;
    const title =
      fireN != null
        ? `Pedido listo #${fireN}: ${label}`
        : `Pedido listo: ${label}`;
    const items = params.items;
    const lineCount = items.reduce((s, it) => s + it.quantity, 0) || 1;
    const groupKey = `dining.order_ready:${params.fireId}:${params.productionUnitId}`;

    await this.publish({
      companyId: params.companyId,
      order: params.order,
      kind: DiningNotificationKind.ORDER_READY,
      title,
      body: this.formatOrderReadyBody(items) || 'Pedido listo',
      groupKey,
      productionUnitId: params.productionUnitId,
      fireId: params.fireId,
      fireNumber: fireN,
      items,
      lineCount,
      actorUserId: params.actorUserId ?? null,
      sentByUserId: params.sentByUserId ?? null,
    });
  }

  private async publish(params: {
    companyId: string;
    order: DiningOrder;
    kind: string;
    title: string;
    body: string;
    groupKey: string;
    productionUnitId: string;
    fireId: string;
    fireNumber: number | null;
    items: KitchenReadyItemSummary[];
    lineCount: number;
    actorUserId: string | null;
    sentByUserId: string | null;
  }): Promise<void> {
    const order = params.order;
    const cmd = new PublishNotificationCommand();
    cmd.companyId = params.companyId;
    cmd.source = NotificationSource.AUTOMATION;
    cmd.domain = NotificationDomain.SALES;
    cmd.kind = params.kind;
    cmd.severity = NotificationSeverity.INFO;
    cmd.title = params.title;
    cmd.body = params.body;
    cmd.groupKey = params.groupKey;
    cmd.payload = {
      orderId: order.id,
      displayLabel: order.displayLabel?.trim() || 'Cuenta',
      diningTableId: order.diningTableId ?? null,
      kitchenFireId: params.fireId,
      kitchenFireNumber: params.fireNumber,
      productionUnitId: params.productionUnitId,
      lineCount: params.lineCount,
      branchId: order.branchId,
      items: params.items,
    };
    cmd.entityType = 'DiningOrder';
    cmd.entityId = order.id;
    cmd.actorUserId = params.actorUserId;
    cmd.audiences = [
      {
        audienceType: NotificationAudienceType.ROLES,
        audienceConfig: {
          // Meseros necesitan la alerta en kai-waiter; POS/admin en campana POS.
          roles: [UserRole.ADMIN, UserRole.POS_OPERATOR, UserRole.WAITER],
        },
      },
    ];
    const userIds = [
      ...new Set(
        [params.sentByUserId, order.openedByUserId]
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean),
      ),
    ];
    if (userIds.length > 0) {
      cmd.audiences.push({
        audienceType: NotificationAudienceType.USER_IDS,
        audienceConfig: { userIds },
      });
    }

    try {
      await this.notificationPublisher.publish(cmd);
    } catch (e) {
      this.logger.warn(
        `Dining kitchen notification failed (${params.kind}): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}
