export type DiningKitchenItemUpdatedPayload = {
  companyId: string;
  unitId: string;
  orderId: string;
  lineId: string;
  kitchenStatus: string;
  displayLabel?: string;
  diningTableId?: string | null;
};

export type DiningKitchenSnapshotLinePayload = {
  id: string;
  diningOrderId: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  kitchenStatus: string;
  productionUnitId?: string | null;
  sentToKitchenAt?: string | null;
  displayLabel?: string;
  diningTableId?: string | null;
  diningTableCode?: string | null;
  productVariant?: { id: string; name: string } | null;
};

export type DiningKitchenSnapshotPayload = {
  companyId: string;
  unitId: string;
  queue: DiningKitchenSnapshotLinePayload[];
};

/** Statuses that remain visible on the KDS queue. */
export const KDS_QUEUE_STATUSES = new Set(["SENT", "PREPARING"]);
