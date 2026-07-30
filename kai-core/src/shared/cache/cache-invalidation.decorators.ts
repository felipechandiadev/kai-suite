import 'reflect-metadata';

/**
 * Tipos de invalidación de caché disponibles
 */
export type CacheInvalidationType =
  | 'customer'
  | 'product'
  | 'transaction'
  | 'session'
  | 'exchange_rate'
  | 'tax_rate'
  | 'custom';

/**
 * Regla de invalidación de caché
 */
export interface CacheInvalidationRule {
  type: CacheInvalidationType;
  pattern?: string; // Para invalidación personalizada
}

/**
 * Decorador para configurar invalidación de caché en endpoints
 *
 * Uso:
 * @InvalidateCache('customer') // Invalida caché del cliente
 * @InvalidateCache('product')  // Invalida caché del producto
 * @InvalidateCache('custom', 'my:pattern:*') // Patrón personalizado
 */
export function InvalidateCache(type: CacheInvalidationType, pattern?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Obtener reglas existentes
    const existingRules =
      Reflect.getMetadata('cache:invalidate', descriptor.value) || [];

    // Agregar nueva regla
    const newRule: CacheInvalidationRule = { type };
    if (pattern) {
      newRule.pattern = pattern;
    }

    existingRules.push(newRule);

    // Guardar reglas actualizadas
    Reflect.defineMetadata('cache:invalidate', existingRules, descriptor.value);
  };
}

/**
 * Decorador compuesto para operaciones comunes
 */
export class CacheInvalidationDecorators {
  /**
   * Invalida caché de cliente (saldo y transacciones)
   */
  static InvalidateCustomer = InvalidateCache('customer');

  /**
   * Invalida caché de producto (inventario y precio)
   */
  static InvalidateProduct = InvalidateCache('product');

  /**
   * Invalida caché de transacción
   */
  static InvalidateTransaction = InvalidateCache('transaction');

  /**
   * Invalida caché de sesión (usuario y caja)
   */
  static InvalidateSession = InvalidateCache('session');

  /**
   * Invalida todas las tasas de cambio
   */
  static InvalidateExchangeRates = InvalidateCache('exchange_rate');

  /**
   * Invalida todas las tasas de impuestos
   */
  static InvalidateTaxRates = InvalidateCache('tax_rate');

  /**
   * Invalida patrón personalizado
   */
  static InvalidatePattern = (pattern: string) =>
    InvalidateCache('custom', pattern);
}
