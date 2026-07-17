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
  kitchenStatus: KitchenItemStatus;
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

export type PosDiningRoomSummary = {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
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

/** Cuenta salón cargada en carrito para cobro en POS. */
export type LoadedDiningOrderMeta = {
  id: string;
  displayLabel: string;
  kind: DiningOrderKind;
};

/** Grupo del buscador de menú en pantalla Cuentas (desktop). */
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
