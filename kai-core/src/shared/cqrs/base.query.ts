/**
 * Base Query Class
 *
 * All queries in the application should extend this base class.
 * Queries are read-only requests (they retrieve data without modifying state).
 *
 * @example
 * export class GetSuppliersQuery extends BaseQuery {
 *   constructor(
 *     public readonly page: number,
 *     public readonly limit: number,
 *     public readonly search?: string,
 *   ) {
 *     super();
 *   }
 * }
 */
export abstract class BaseQuery<T = any> {
  /**
   * Unique identifier for this query instance
   * Auto-generated to track query execution and caching
   */
  readonly id: string = crypto.randomUUID();

  /**
   * Timestamp when query was created
   */
  readonly timestamp: Date = new Date();

  /**
   * Expected return type (for type safety)
   * @internal Used for TypeScript type inference
   */
  readonly _resultType?: T;

  /**
   * Optional metadata (user ID, correlation ID, etc.)
   */
  metadata?: Record<string, any>;
}
