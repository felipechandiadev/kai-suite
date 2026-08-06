export type DiningOrderKind = "TABLE" | "COUNTER" | "TAKEAWAY";

export type DiningOrderStatus =
  | "FREE"
  | "OPEN"
  | "SENT"
  | "PARTIAL_READY"
  | "READY"
  | "BILLING"
  | "CLOSED";

export type KitchenItemStatus =
  | "DRAFT"
  | "SENT"
  | "PREPARING"
  | "READY"
  | "READY_FOR_PICKUP"
  | "SERVED"
  | "CANCELLED";

export type PosDiningOrderProfile = {
  adultCount?: number;
  childCount?: number;
  notes?: string;
  /** Nombre para llamar al cliente; por defecto igual a displayLabel. */
  customerName?: string;
};

export type PosDiningOrderLine = {
  id: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  productionUnitId?: string | null;
  kitchenStatus: KitchenItemStatus;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
};

export type PosDiningOrderSummary = {
  id: string;
  branchId: string;
  kind: DiningOrderKind;
  displayLabel: string;
  status: DiningOrderStatus;
  diningTableId?: string | null;
  diningRoomId?: string | null;
  diningRoomName?: string | null;
  tableCode?: string | null;
  openedAt: string;
  profile?: PosDiningOrderProfile | null;
  lines: PosDiningOrderLine[];
};

export type PosDiningTableSummary = {
  id: string;
  code: string;
  label: string;
};

export type PosDiningRoomSummary = {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
  tables?: PosDiningTableSummary[];
};

export type PosDiningBranchSettings = {
  timezone: string;
  resetTimeLocal: string;
  allowWaiterOpenTable: boolean;
  allowPosOpenTable: boolean;
  /** Vacío = universo “todas” (badges = categorías resueltas). */
  posAccountsMenuCategoryIds: string[];
  posAccountsMenuCategories: Array<{ id: string; name: string }>;
};

export type PosDiningOrdersListResponse =
  | { success: true; orders: PosDiningOrderSummary[] }
  | { success: false; message: string };

export type PosDiningOrderDetailResponse =
  | { success: true; order: PosDiningOrderSummary }
  | { success: false; message: string };

export type PosDiningRoomsListResponse =
  | { success: true; rooms: PosDiningRoomSummary[] }
  | { success: false; message: string };

export type PosDiningMutationResponse =
  | { success: true; order: PosDiningOrderSummary }
  | { success: false; message: string };

/** @deprecated Prefer category badges; kept for searchMenu legacy. */
export type PosDiningMenuGroup = "fisicos" | "preparados";

export type PosDiningMenuVariant = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  productType: string;
};

export type PosDiningMenuSearchResponse =
  | { success: true; items: PosDiningMenuVariant[] }
  | { success: false; message: string };
