import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionScopeMode,
  PromotionType,
} from './promotion.enums';

/**
 * Espejo de `kai-core/.../discount-engine.types.ts`. Los tipos y los
 * imports relativos son la única diferencia. La paridad se valida en
 * `engine-mirror-parity.spec.ts` (backend).
 */

export interface EngineCartLine {
  lineId: string;
  variantId: string;
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
  frozenDiscount?: ResolvedLineDiscount | null;
}

export interface EngineContext {
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
  now: Date;
}

export interface EffectivePromotionScopes {
  branches: { branchId: string; mode: PromotionScopeMode }[];
  pointsOfSale: { pointOfSaleId: string; mode: PromotionScopeMode }[];
  products: { productId: string; mode: PromotionScopeMode }[];
  variants: { variantId: string; mode: PromotionScopeMode }[];
  categories: { categoryId: string; mode: PromotionScopeMode }[];
  customers: { customerId: string; mode: PromotionScopeMode }[];
  paymentMethods: { companyPaymentMethodId: string; mode: PromotionScopeMode }[];
}

export interface EffectivePromotion {
  id: string;
  code: string;
  name: string;
  type: PromotionType;
  value: number;
  maxValue?: number | null;
  validFrom?: string | Date | null;
  validUntil?: string | Date | null;
  activation: PromotionActivation;
  redemptionCode?: string | null;
  stackable: boolean;
  priority: number;
  minSubtotal?: number | null;
  minQuantity?: number | null;
  daysOfWeek?: number[] | null;
  hourFrom?: string | null;
  hourTo?: string | null;
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  usesCount: number;
  authorization: PromotionAuthorization;
  authorizationLimitPct?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  getDiscountPercent?: number | null;
  accountingTag?: string | null;
  scopes: EffectivePromotionScopes;
}

export interface ManualSelection {
  promotionId: string;
  lineIds?: string[];
}

export interface CustomerHistoryEntry {
  promotionId: string;
  usesByThisCustomer: number;
}

export interface ResolvedLineDiscount {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  discountPercentage: number;
  discountAmount: number;
  appliedQuantity: number;
  overridesUnitPrice?: boolean;
  newUnitPrice?: number;
}

export interface ResolvedLine {
  lineId: string;
  discount: ResolvedLineDiscount | null;
}

export interface AppliedSnapshot {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  type: PromotionType;
  activation: PromotionActivation;
  authorization: PromotionAuthorization;
  amountDiscounted: number;
  affectedLineIds: string[];
  isOrderLevel: boolean;
  accountingTag?: string | null;
}

export interface EngineWarning {
  promotionId: string;
  code: WarningCode;
  message: string;
}

export type WarningCode =
  | 'EXPIRING_SOON'
  | 'CUSTOMER_LIMIT_REACHED'
  | 'GLOBAL_LIMIT_REACHED'
  | 'AUTHORIZATION_REQUIRED'
  | 'CASHIER_LIMIT_APPLIED';

export interface EngineResult {
  resolvedLines: ResolvedLine[];
  orderDiscountAmount: number;
  appliedPromotions: AppliedSnapshot[];
  warnings: EngineWarning[];
}

export interface ApplyPromotionsArgs {
  cart: {
    lines: EngineCartLine[];
    customerId: string | null;
    paymentMethodIds: string[];
  };
  ctx: EngineContext;
  promotions: EffectivePromotion[];
  manualSelections: ManualSelection[];
  customerHistory: CustomerHistoryEntry[];
}
