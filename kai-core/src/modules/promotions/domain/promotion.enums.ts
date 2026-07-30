/**
 * Tipos de promoción soportados por el motor de descuentos.
 *
 *  - `PERCENT_ON_LINE`: porcentaje (0..100) aplicado a líneas que
 *    cumplen los scopes de producto / categoría.
 *  - `AMOUNT_ON_LINE`: monto fijo (CLP entero) restado al subtotal de
 *    cada línea elegible.
 *  - `PERCENT_ON_ORDER`: porcentaje aplicado al subtotal completo de la
 *    venta una vez resueltos los descuentos por línea.
 *  - `AMOUNT_ON_ORDER`: monto fijo aplicado al subtotal de la venta.
 *  - `PRICE_OVERRIDE`: fuerza el `unitPrice` de las líneas elegibles a
 *    `value`. Útil para "precio empleado".
 *  - `BUY_X_GET_Y`: "lleva X paga Y" — por cada `buyQuantity + getQuantity`
 *    unidades de la línea elegible, las `getQuantity` últimas quedan
 *    con `getDiscountPercent` (típicamente 100 = gratis).
 */
export enum PromotionType {
  PERCENT_ON_LINE = 'PERCENT_ON_LINE',
  AMOUNT_ON_LINE = 'AMOUNT_ON_LINE',
  PERCENT_ON_ORDER = 'PERCENT_ON_ORDER',
  AMOUNT_ON_ORDER = 'AMOUNT_ON_ORDER',
  PRICE_OVERRIDE = 'PRICE_OVERRIDE',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

/**
 * Modo de activación.
 *
 *  - `AUTO`: el motor la aplica automáticamente cuando se cumplen los
 *    criterios de elegibilidad.
 *  - `MANUAL`: el cajero la elige explícitamente desde el POS aún si
 *    técnicamente sería elegible (e.g. para no descontar por defecto).
 *  - `CODE_ENTRY`: requiere ingresar un `redemptionCode` (cupón).
 *    No se expone en el listado público del POS.
 */
export enum PromotionActivation {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
  CODE_ENTRY = 'CODE_ENTRY',
}

/**
 * Nivel de autorización requerido para que el cajero aplique la
 * promoción.
 *
 *  - `NONE`: no requiere acción adicional.
 *  - `CASHIER`: cajero la aplica, pero limitada por
 *    `authorizationLimitPct` (e.g. cajero puede dar hasta 5% manual).
 *  - `MANAGER_PIN`: requiere PIN de gerente.
 */
export enum PromotionAuthorization {
  NONE = 'NONE',
  CASHIER = 'CASHIER',
  MANAGER_PIN = 'MANAGER_PIN',
}

/**
 * Modo de scope para las tablas pivote (productos, categorías, etc.).
 *
 *  - `INCLUDE`: la promoción aplica SOLO a estos elementos.
 *  - `EXCLUDE`: la promoción aplica a TODOS menos a estos.
 *
 * Si una tabla scope no tiene filas para una promoción, esa dimensión
 * no tiene restricción.
 */
export enum PromotionScopeMode {
  INCLUDE = 'INCLUDE',
  EXCLUDE = 'EXCLUDE',
}
