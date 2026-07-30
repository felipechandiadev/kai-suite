/**
 * Cache Interface - Domain Layer
 *
 * Define el contrato para operaciones de caché.
 * La aplicación depende de esta interfaz, no de implementaciones concretas.
 */
export interface CachePort {
  /**
   * Obtiene un valor del caché
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Almacena un valor en el caché
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Elimina un valor del caché
   */
  del(key: string): Promise<void>;

  /**
   * Verifica si una clave existe en el caché
   */
  exists(key: string): Promise<boolean>;

  /**
   * Incrementa un contador en el caché
   */
  incr(key: string): Promise<number>;

  /**
   * Establece expiración a una clave
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * Obtiene múltiples valores
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Almacena múltiples valores
   */
  mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void>;

  /**
   * Elimina múltiples claves
   */
  mdel(keys: string[]): Promise<void>;

  /**
   * Obtiene todas las claves que coinciden con un patrón
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Limpia todo el caché
   */
  flush(): Promise<void>;
}

/**
 * Cache Keys - Constantes para claves de caché
 */
export class CacheKeys {
  // Customers
  static CUSTOMER_BALANCE(customerId: string): string {
    return `customer:balance:${customerId}`;
  }

  static CUSTOMER_TRANSACTIONS(customerId: string, page: number = 1): string {
    return `customer:transactions:${customerId}:page:${page}`;
  }

  // Products/Inventory
  static PRODUCT_INVENTORY(productId: string): string {
    return `product:inventory:${productId}`;
  }

  static PRODUCT_PRICE(productId: string): string {
    return `product:price:${productId}`;
  }

  // Transactions
  static TRANSACTION_DETAILS(transactionId: string): string {
    return `transaction:details:${transactionId}`;
  }

  static TRANSACTION_SUMMARY(date: string): string {
    return `transaction:summary:${date}`;
  }

  // Sessions
  static USER_SESSION(sessionId: string): string {
    return `session:user:${sessionId}`;
  }

  static CASH_SESSION(sessionId: string): string {
    return `session:cash:${sessionId}`;
  }

  // Business Rules
  static EXCHANGE_RATE(from: string, to: string): string {
    return `exchange:rate:${from}:${to}`;
  }

  static TAX_RATE(taxType: string): string {
    return `tax:rate:${taxType}`;
  }

  // Analytics
  static DAILY_SALES(date: string): string {
    return `analytics:sales:daily:${date}`;
  }

  static MONTHLY_REPORT(year: number, month: number): string {
    return `analytics:report:${year}:${month}`;
  }
}

/**
 * Cache TTL - Constantes para tiempos de expiración
 */
export class CacheTTL {
  static readonly SECOND = 1;
  static readonly MINUTE = 60;
  static readonly HOUR = 3600;
  static readonly DAY = 86400;
  static readonly WEEK = 604800;

  // Business specific TTLs
  static readonly CUSTOMER_BALANCE = 5 * CacheTTL.MINUTE; // 5 minutes
  static readonly PRODUCT_INVENTORY = 2 * CacheTTL.MINUTE; // 2 minutes
  static readonly PRODUCT_PRICE = 10 * CacheTTL.MINUTE; // 10 minutes
  static readonly TRANSACTION_DETAILS = 30 * CacheTTL.MINUTE; // 30 minutes
  static readonly USER_SESSION = 24 * CacheTTL.HOUR; // 24 hours
  static readonly CASH_SESSION = 8 * CacheTTL.HOUR; // 8 hours
  static readonly EXCHANGE_RATE = 1 * CacheTTL.HOUR; // 1 hour
  static readonly TAX_RATE = 6 * CacheTTL.HOUR; // 6 hours
  static readonly ANALYTICS = 1 * CacheTTL.HOUR; // 1 hour
}
