export type NotificationDomain = "STOCK" | string;

export type NotificationDeliveryStatus = "UNREAD" | "READ" | "ARCHIVED" | "DISMISSED";

export type InboxNotification = {
  id: string;
  domain: NotificationDomain;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type InboxItem = {
  deliveryId: string;
  status: NotificationDeliveryStatus;
  deliveredAt: string;
  readAt: string | null;
  notification: InboxNotification;
};

export type NotificationDeliveryWsPayload = {
  deliveryId: string;
  companyId: string;
  userId: string;
  status: NotificationDeliveryStatus;
  deliveredAt: string;
  notification: InboxNotification;
};

export type StockAlertPreview = {
  deliveryId: string;
  title: string;
  body: string | null;
  kind: string;
  receivedAt: number;
  productVariantId: string;
  storageId: string;
  physicalStock: number;
  alerts: string[];
};
