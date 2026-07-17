import type {
  DiningOrderKind,
  DiningOrderStatus,
  KitchenItemStatus,
} from '@modules/dining/domain/dining.enums';

export function salonRoom(params: {
  companyId: string;
  branchId: string;
  salonId: string;
}): string {
  return `company:${params.companyId}:branch:${params.branchId}:salon:${params.salonId}`;
}

export function kitchenUnitRoom(params: {
  companyId: string;
  unitId: string;
}): string {
  return `company:${params.companyId}:unit:${params.unitId}`;
}

export type DiningSessionLinePayload = {
  id: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  kitchenStatus: KitchenItemStatus;
  productionUnitId?: string | null;
};

export type DiningSessionUpdatedPayload = {
  companyId: string;
  branchId: string;
  salonId?: string | null;
  orderId: string;
  kind: DiningOrderKind;
  status: DiningOrderStatus;
  displayLabel: string;
  diningTableId?: string | null;
  items: DiningSessionLinePayload[];
};

export type DiningKitchenItemUpdatedPayload = {
  companyId: string;
  unitId: string;
  orderId: string;
  lineId: string;
  kitchenStatus: KitchenItemStatus;
  displayLabel?: string;
  diningTableId?: string | null;
};

export type DiningKitchenSnapshotLinePayload = {
  id: string;
  diningOrderId: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  kitchenStatus: KitchenItemStatus;
  productionUnitId?: string | null;
  sentToKitchenAt?: string | null;
  displayLabel?: string;
  diningTableId?: string | null;
};

export type DiningKitchenSnapshotPayload = {
  companyId: string;
  unitId: string;
  queue: DiningKitchenSnapshotLinePayload[];
};
