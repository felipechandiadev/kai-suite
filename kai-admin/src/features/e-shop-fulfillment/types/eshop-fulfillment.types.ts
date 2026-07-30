export type EShopStockPolicy =
  | "ALLOW_BACKORDER"
  | "BLOCK_OUT_OF_STOCK"
  | "IGNORE_STOCK";

export type EShopFulfillmentMethodType =
  | "PICKUP"
  | "LOCAL_DELIVERY"
  | "FLAT_RATE"
  | "FREE_OVER_THRESHOLD"
  | "MANUAL_QUOTE";

export type CanonicalFulfillmentCode = "pickup" | "local-delivery";

export type EShopFulfillmentStatus =
  | "SUBMITTED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "READY_FOR_DISPATCH"
  | "IN_TRANSIT"
  | "SHIPPED"
  | "DELIVERED"
  | "ISSUE"
  | "CANCELLED";

export type EShopFulfillmentMethodRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: EShopFulfillmentMethodType;
  priceFlat: number | null;
  freeShippingThreshold: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  requiresAddress: boolean;
  requiresPhone: boolean;
  instructions: string | null;
  pickupBranchId: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CanonicalFulfillmentMethodRow = {
  id: string;
  code: CanonicalFulfillmentCode;
  name: string;
  description: string | null;
  type: EShopFulfillmentMethodType;
  isActive: boolean;
  instructions: string | null;
  sortOrder: number;
};

export type LocalDeliveryOperationalReadiness = {
  localDeliveryEnabled: boolean;
  depotConfigured: boolean;
  communesEnabled: boolean;
  zonesActive: boolean;
  occurrencesAvailable: boolean;
};

export type CanonicalFulfillmentMethodsResponse = {
  methods: CanonicalFulfillmentMethodRow[];
  localDeliveryReadiness: LocalDeliveryOperationalReadiness;
};

export type EShopFulfillmentSettings = {
  eShopStockPolicy: EShopStockPolicy;
  eShopFreeShippingThreshold: number | null;
  eShopDefaultBranchId: string | null;
  eShopDefaultStorageId: string | null;
  eShopDefaultPriceListId: string | null;
  eShopCustomerPortalEnabled?: boolean;
  eShopRegistrationRequireRut?: boolean;
  eShopShowDebtsInPortal?: boolean;
};

export type EShopOrderListRow = {
  id: string;
  documentNumber: string;
  transactionType: string;
  total: number;
  createdAt: string;
  fulfillmentStatus: EShopFulfillmentStatus;
  fulfillmentMethodName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  isLegacy: boolean;
  isTerminal: boolean;
  orderSource?: string;
  backorderReservationStatus?: string | null;
  backorderDepositAmount?: number;
};

export type EShopOrderDetail = EShopOrderListRow & {
  status: string;
  notes?: string | null;
  shippingCost: number;
  shippingAddress: Record<string, string | null> | null;
  stockSnapshot: Array<{ variantId: string; requestedQty: number; availableQty: number }>;
  statusHistory: Array<{
    status: EShopFulfillmentStatus;
    at: string;
    byUserId?: string | null;
    note?: string | null;
  }>;
  lines: Array<{
    id: string;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  customerId?: string | null;
};
