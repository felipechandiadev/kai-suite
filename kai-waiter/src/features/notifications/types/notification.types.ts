export type WaiterInboxNotification = {
  id: string;
  domain: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type WaiterInboxItem = {
  deliveryId: string;
  status: string;
  deliveredAt: string;
  readAt: string | null;
  notification: WaiterInboxNotification;
};

export type WaiterNotificationRow = {
  deliveryId: string;
  title: string;
  body: string | null;
  kind: string;
  receivedAt: number;
  orderId: string | null;
  diningTableId: string | null;
  kitchenFireId: string | null;
  kitchenFireNumber: number | null;
  diningItems?: Array<{ name: string; quantity: number; notes: string | null }>;
};

export type WaiterNotificationDeliveryWsPayload = {
  deliveryId: string;
  companyId: string;
  userId: string;
  status: string;
  deliveredAt: string;
  notification: WaiterInboxNotification;
};
