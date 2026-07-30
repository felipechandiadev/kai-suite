import { Injectable } from '@nestjs/common';
import { NotificationPublisherService } from '@modules/notifications/application/notification-publisher.service';
import {
  NotificationAudienceType,
  NotificationDomain,
  NotificationSeverity,
  NotificationSource,
} from '@modules/notifications/domain/notification.enums';
import type { Transaction } from '@modules/transactions/domain/transaction.entity';
import type { TransactionEShopOrderMetadata } from '@modules/transactions/domain/transaction-eshop-order.metadata';
import type { EShopFulfillmentStatus } from '@modules/transactions/domain/transaction-eshop-order.metadata';

export const EShopNotificationKind = {
  ORDER_CREATED: 'eshop.order.created',
  ORDER_STATUS_CHANGED: 'eshop.order.status_changed',
} as const;

@Injectable()
export class EShopOrderNotificationService {
  constructor(private readonly publisher: NotificationPublisherService) {}

  async publishOrderCreated(companyId: string, tx: Transaction): Promise<void> {
    const meta = this.readMeta(tx);
    await this.publisher.publish({
      companyId,
      source: NotificationSource.AUTOMATION,
      domain: NotificationDomain.SALES,
      kind: EShopNotificationKind.ORDER_CREATED,
      severity: NotificationSeverity.INFO,
      title: `Nuevo pedido web #${tx.documentNumber ?? '—'}`,
      body: meta.customerSnapshot?.name
        ? `Cliente: ${meta.customerSnapshot.name}`
        : 'Nuevo pedido desde la tienda en línea',
      payload: {
        orderId: tx.id,
        orderNumber: tx.documentNumber,
        total: Number(tx.total),
        fulfillmentStatus: meta.fulfillmentStatus,
        customerName: meta.customerSnapshot?.name,
      },
      entityType: 'ESHOP_ORDER',
      entityId: tx.id,
      groupKey: `eshop-order:${tx.id}`,
      audiences: [
        {
          audienceType: NotificationAudienceType.ROLES,
          audienceConfig: { roles: ['ADMIN', 'OPERATOR'] },
        },
      ],
    });
  }

  async publishStatusChanged(
    companyId: string,
    tx: Transaction,
    status: EShopFulfillmentStatus,
  ): Promise<void> {
    const meta = this.readMeta(tx);
    await this.publisher.publish({
      companyId,
      source: NotificationSource.AUTOMATION,
      domain: NotificationDomain.SALES,
      kind: EShopNotificationKind.ORDER_STATUS_CHANGED,
      severity: NotificationSeverity.INFO,
      title: `Pedido #${tx.documentNumber ?? '—'}: ${status}`,
      body: meta.customerSnapshot?.name
        ? `Cliente: ${meta.customerSnapshot.name}`
        : undefined,
      payload: {
        orderId: tx.id,
        orderNumber: tx.documentNumber,
        fulfillmentStatus: status,
        customerName: meta.customerSnapshot?.name,
      },
      entityType: 'ESHOP_ORDER',
      entityId: tx.id,
      groupKey: `eshop-order:${tx.id}:${status}`,
      audiences: [
        {
          audienceType: NotificationAudienceType.ROLES,
          audienceConfig: { roles: ['ADMIN', 'OPERATOR'] },
        },
      ],
    });
  }

  private readMeta(tx: Transaction): TransactionEShopOrderMetadata {
    const raw = (tx.metadata ?? {}) as Record<string, unknown>;
    return (raw.eShopOrder ?? {}) as TransactionEShopOrderMetadata;
  }
}
