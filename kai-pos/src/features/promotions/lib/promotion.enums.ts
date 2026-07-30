/**
 * Espejo byte-a-byte de
 * `kai-core/src/modules/promotions/domain/promotion.enums.ts`. La paridad
 * la valida el test
 * `kai-core/src/modules/promotions/application/tests/engine-mirror-parity.spec.ts`.
 *
 * Si modificas este archivo, modifica el original y viceversa.
 */
export enum PromotionType {
  PERCENT_ON_LINE = 'PERCENT_ON_LINE',
  AMOUNT_ON_LINE = 'AMOUNT_ON_LINE',
  PERCENT_ON_ORDER = 'PERCENT_ON_ORDER',
  AMOUNT_ON_ORDER = 'AMOUNT_ON_ORDER',
  PRICE_OVERRIDE = 'PRICE_OVERRIDE',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

export enum PromotionActivation {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
  CODE_ENTRY = 'CODE_ENTRY',
}

export enum PromotionAuthorization {
  NONE = 'NONE',
  CASHIER = 'CASHIER',
  MANAGER_PIN = 'MANAGER_PIN',
}

export enum PromotionScopeMode {
  INCLUDE = 'INCLUDE',
  EXCLUDE = 'EXCLUDE',
}
