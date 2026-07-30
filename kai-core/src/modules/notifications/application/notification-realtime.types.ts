import type {
  NotificationDeliveryStatus,
  NotificationDomain,
  NotificationSeverity,
} from '../domain/notification.enums';

export type NotificationDeliveryWsPayload = {
  deliveryId: string;
  companyId: string;
  userId: string;
  status: NotificationDeliveryStatus;
  deliveredAt: string;
  notification: {
    id: string;
    domain: NotificationDomain;
    kind: string;
    severity: NotificationSeverity;
    title: string;
    body: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
  };
};
