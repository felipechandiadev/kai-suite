export type PromotionType =
  | "PERCENT_ON_LINE"
  | "AMOUNT_ON_LINE"
  | "PERCENT_ON_ORDER"
  | "AMOUNT_ON_ORDER"
  | "PRICE_OVERRIDE"
  | "BUY_X_GET_Y";

export type PromotionActivation = "AUTO" | "MANUAL" | "CODE_ENTRY";

export type PromotionAuthorization = "NONE" | "CASHIER" | "MANAGER_PIN";

export type PromotionScopeMode = "INCLUDE" | "EXCLUDE";

export type PromotionEffectiveStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "EXPIRED"
  | "EXPIRING_SOON";

export const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  PERCENT_ON_LINE: "% en línea",
  AMOUNT_ON_LINE: "Monto en línea",
  PERCENT_ON_ORDER: "% al total",
  AMOUNT_ON_ORDER: "Monto al total",
  PRICE_OVERRIDE: "Precio especial",
  BUY_X_GET_Y: "Lleva X paga Y",
};

/** Texto de ayuda en el paso 1 del editor (alineado al motor backend). */
export const PROMOTION_TYPE_DESCRIPTION: Record<PromotionType, string> = {
  PERCENT_ON_LINE:
    "Descuento porcentual sobre cada línea del carrito que cumpla los filtros de producto o categoría.",
  AMOUNT_ON_LINE:
    "Descuento fijo en pesos aplicado al subtotal de cada línea elegible (útil para montos fijos por ítem).",
  PERCENT_ON_ORDER:
    "Porcentaje sobre el subtotal del pedido completo, después de resolver descuentos por línea.",
  AMOUNT_ON_ORDER:
    "Monto fijo en pesos descontado una vez del total del pedido (no por línea).",
  PRICE_OVERRIDE:
    "Fija el precio unitario de las líneas elegibles a un valor concreto (ej. precio empleado o oferta cerrada).",
  BUY_X_GET_Y:
    "Por cada grupo de unidades compradas, las últimas unidades del grupo reciben un descuento (100% = gratis).",
};

export const PROMOTION_ACTIVATION_LABEL: Record<PromotionActivation, string> = {
  AUTO: "Automática",
  MANUAL: "Manual",
  CODE_ENTRY: "Con cupón",
};

export const PROMOTION_AUTHORIZATION_LABEL: Record<
  PromotionAuthorization,
  string
> = {
  NONE: "Sin restricción",
  CASHIER: "Cajero (limitada)",
  MANAGER_PIN: "Requiere PIN de gerente",
};

export const PROMOTION_STATUS_LABEL: Record<PromotionEffectiveStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  EXPIRED: "Vencida",
  EXPIRING_SOON: "Vence pronto",
};

export interface PromotionRow {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  maxValue: number | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  activation: PromotionActivation;
  redemptionCode: string | null;
  stackable: boolean;
  priority: number;
  usesCount: number;
  maxUsesTotal: number | null;
  effectiveStatus: PromotionEffectiveStatus;
  scopeSummary: {
    branches: number;
    pointsOfSale: number;
    products: number;
    variants: number;
    categories: number;
    customers: number;
    paymentMethods: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PromotionScopes {
  branches: { branchId: string; mode: PromotionScopeMode }[];
  pointsOfSale: { pointOfSaleId: string; mode: PromotionScopeMode }[];
  products: { productId: string; mode: PromotionScopeMode }[];
  variants: { productVariantId: string; mode: PromotionScopeMode }[];
  categories: { categoryId: string; mode: PromotionScopeMode }[];
  customers: { customerId: string; mode: PromotionScopeMode }[];
  paymentMethods: { companyPaymentMethodId: string; mode: PromotionScopeMode }[];
}

export interface PromotionDetail extends PromotionRow {
  minSubtotal: number | null;
  minQuantity: number | null;
  daysOfWeek: number[] | null;
  hourFrom: string | null;
  hourTo: string | null;
  maxUsesPerCustomer: number | null;
  authorization: PromotionAuthorization;
  authorizationLimitPct: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  getDiscountPercent: number | null;
  preloadOnPaymentScreen: boolean;
  displayOrder: number;
  accountingTag: string | null;
  scopes: PromotionScopes;
}

export interface CreatePromotionInput {
  /**
   * Código interno. Si no se envía, el backend lo autogenera a partir
   * del `name`. La UI ya no expone este campo en el editor.
   */
  code?: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  value: number;
  maxValue?: number | null;
  isActive?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  activation: PromotionActivation;
  redemptionCode?: string | null;
  stackable?: boolean;
  priority?: number;
  minSubtotal?: number | null;
  minQuantity?: number | null;
  daysOfWeek?: number[] | null;
  hourFrom?: string | null;
  hourTo?: string | null;
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  authorization?: PromotionAuthorization;
  authorizationLimitPct?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  getDiscountPercent?: number | null;
  preloadOnPaymentScreen?: boolean;
  displayOrder?: number;
  accountingTag?: string | null;
  scopes?: Partial<PromotionScopes>;
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;
