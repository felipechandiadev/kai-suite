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

/** Room por mesa (mesero con esa cuenta abierta). */
export function tableRoom(params: {
  companyId: string;
  tableId: string;
}): string {
  return `company:${params.companyId}:table:${params.tableId}`;
}

/** Room de sucursal para POS / cuentas (mesas, barra, takeaway). */
export function branchDiningRoom(params: {
  companyId: string;
  branchId: string;
}): string {
  return `company:${params.companyId}:branch:${params.branchId}:dining`;
}

export function kitchenUnitRoom(params: {
  companyId: string;
  unitId: string;
}): string {
  return `company:${params.companyId}:unit:${params.unitId}`;
}

/** Room público Kai Board por sucursal (auth por display token). */
export function boardBranchRoom(params: {
  companyId: string;
  branchId: string;
}): string {
  return `company:${params.companyId}:branch:${params.branchId}:board`;
}

export type DiningSessionLinePayload = {
  id: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  kitchenStatus: KitchenItemStatus;
  productionUnitId?: string | null;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
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
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
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
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
  sentToKitchenAt?: string | null;
  displayLabel?: string;
  diningTableId?: string | null;
  diningTableCode?: string | null;
  productVariant?: {
    id: string;
    name: string;
    attributes?: Array<{ attributeValue: string }>;
  } | null;
};

export type DiningKitchenSnapshotPayload = {
  companyId: string;
  unitId: string;
  queue: DiningKitchenSnapshotLinePayload[];
};
