/**
 * Contrato de `Transaction.metadata.eShopOrder` para pedidos web (`source: 'e-shop'`).
 */
export type EShopFulfillmentStatus =
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'READY_FOR_DISPATCH'
  | 'IN_TRANSIT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'ISSUE'
  | 'CANCELLED';

export type EShopStockPolicy =
  | 'ALLOW_BACKORDER'
  | 'BLOCK_OUT_OF_STOCK'
  | 'IGNORE_STOCK';

export interface EShopFulfillmentMethodSnapshot {
  id: string;
  code: string;
  name: string;
  type: string;
  price: number;
  instructions?: string | null;
}

export interface EShopOrderShippingAddress {
  line1?: string | null;
  commune?: string | null;
  region?: string | null;
  notes?: string | null;
}

export interface EShopOrderCustomerSnapshot {
  name: string;
  email: string;
  phone?: string | null;
}

export interface EShopOrderStockLineSnapshot {
  variantId: string;
  requestedQty: number;
  availableQty: number;
}

export interface EShopOrderStatusHistoryEntry {
  status: EShopFulfillmentStatus;
  at: string;
  byUserId?: string | null;
  note?: string | null;
}

export type EShopPaymentExpectation = 'NONE' | 'ONLINE_REQUIRED' | 'COORDINATE_LATER';

export interface TransactionEShopOrderMetadata {
  fulfillmentStatus: EShopFulfillmentStatus;
  fulfillmentMethodId: string;
  fulfillmentMethodSnapshot: EShopFulfillmentMethodSnapshot;
  shippingCost: number;
  shippingAddress?: EShopOrderShippingAddress | null;
  customerSnapshot: EShopOrderCustomerSnapshot;
  stockPolicyApplied: EShopStockPolicy;
  stockSnapshot?: EShopOrderStockLineSnapshot[];
  statusHistory: EShopOrderStatusHistoryEntry[];
  paymentExpectation: EShopPaymentExpectation;
  paymentGatewayIntentId?: string | null;
  customerNotes?: string | null;
  isLegacy?: boolean;
}

export const ESHOP_ORDER_TERMINAL_STATUSES: EShopFulfillmentStatus[] = [
  'DELIVERED',
  'CANCELLED',
];

export const ESHOP_ORDER_STATUS_TRANSITIONS: Record<
  EShopFulfillmentStatus,
  EShopFulfillmentStatus[]
> = {
  SUBMITTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'READY_FOR_DISPATCH', 'SHIPPED', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
  READY_FOR_DISPATCH: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'ISSUE', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  ISSUE: ['DELIVERED', 'CANCELLED'],
  CANCELLED: [],
};
