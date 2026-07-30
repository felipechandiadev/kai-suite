import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionScopeMode,
  PromotionType,
} from '../domain/promotion.enums';

/**
 * Tipos compartidos por el motor de descuentos (backend) y su mirror en
 * kai-pos. Mantenlos byte-a-byte iguales: cualquier cambio aquí debe
 * propagarse al mirror, validado por el test de paridad.
 */

/** Línea del carrito tal como entra al motor. */
export interface EngineCartLine {
  lineId: string;
  variantId: string;
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
  /**
   * Descuento "frozen" pre-cargado (e.g. cotización ya aceptada). Si
   * está presente, el motor lo respeta y NO re-aplica promociones a
   * esta línea.
   */
  frozenDiscount?: ResolvedLineDiscount | null;
}

/** Contexto operativo de la venta. */
export interface EngineContext {
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
  now: Date;
}

/** Conjunto de scopes ya pre-cargados para evaluar elegibilidad. */
export interface EffectivePromotionScopes {
  branches: { branchId: string; mode: PromotionScopeMode }[];
  pointsOfSale: { pointOfSaleId: string; mode: PromotionScopeMode }[];
  products: { productId: string; mode: PromotionScopeMode }[];
  variants: { variantId: string; mode: PromotionScopeMode }[];
  categories: { categoryId: string; mode: PromotionScopeMode }[];
  customers: { customerId: string; mode: PromotionScopeMode }[];
  paymentMethods: { companyPaymentMethodId: string; mode: PromotionScopeMode }[];
}

/**
 * Vista "efectiva" de una promoción: la entidad SQL aplanada y lista
 * para evaluar. El backend la arma a partir del repo, el POS la recibe
 * por endpoint.
 */
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

/**
 * Indica al motor que aplique manualmente una promoción `MANUAL` o
 * `CODE_ENTRY`. Opcionalmente restringe a un subconjunto de líneas.
 */
export interface ManualSelection {
  promotionId: string;
  lineIds?: string[];
}

export interface CustomerHistoryEntry {
  promotionId: string;
  usesByThisCustomer: number;
}

/** Descuento resuelto por línea — lo que el cierre persiste. */
export interface ResolvedLineDiscount {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  discountPercentage: number;
  discountAmount: number;
  appliedQuantity: number;
  /**
   * Si `true`, sobrescribió el `unitPrice` original (PRICE_OVERRIDE).
   * El motor seguirá emitiendo `discountAmount` por compatibilidad
   * contable, pero el cliente puede mostrar el precio nuevo.
   */
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

/** Argumentos completos de la función pública del motor. */
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
