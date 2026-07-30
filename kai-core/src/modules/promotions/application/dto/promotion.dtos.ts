import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionScopeMode,
  PromotionType,
} from '../../domain/promotion.enums';

export interface ScopeItemBranchDto {
  branchId: string;
  mode: PromotionScopeMode;
}
export interface ScopeItemPosDto {
  pointOfSaleId: string;
  mode: PromotionScopeMode;
}
export interface ScopeItemProductDto {
  productId: string;
  mode: PromotionScopeMode;
}
export interface ScopeItemVariantDto {
  productVariantId: string;
  mode: PromotionScopeMode;
}
export interface ScopeItemCategoryDto {
  categoryId: string;
  mode: PromotionScopeMode;
}
export interface ScopeItemCustomerDto {
  customerId: string;
  mode: PromotionScopeMode;
}
export interface ScopeItemPaymentMethodDto {
  companyPaymentMethodId: string;
  mode: PromotionScopeMode;
}

export interface PromotionScopesDto {
  branches?: ScopeItemBranchDto[];
  pointsOfSale?: ScopeItemPosDto[];
  products?: ScopeItemProductDto[];
  variants?: ScopeItemVariantDto[];
  categories?: ScopeItemCategoryDto[];
  customers?: ScopeItemCustomerDto[];
  paymentMethods?: ScopeItemPaymentMethodDto[];
}

export interface CreatePromotionDto {
  /**
   * Código interno legible. Si no se envía, el backend lo autogenera
   * a partir del `name` (slug + sufijo aleatorio) garantizando unicidad
   * por empresa. La UI ya no expone este campo.
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
  scopes?: PromotionScopesDto;
}

export type UpdatePromotionDto = Partial<CreatePromotionDto>;

export interface ListPromotionsQueryDto {
  page?: string;
  limit?: string;
  search?: string;
  isActive?: string;
  type?: PromotionType;
  activation?: PromotionActivation;
  effectiveStatus?: 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'EXPIRING_SOON';
  sortField?: string;
  sort?: string;
}

export interface TogglePromotionActiveDto {
  isActive: boolean;
}
