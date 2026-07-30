/**
 * Base Domain Event Class
 *
 * All domain events in the application should extend this base class.
 * Events represent things that have already happened in the business domain.
 * They are emitted by aggregates and handled by event handlers (in same or other modules).
 *
 * @example
 * export class SupplierCreatedEvent extends BaseDomainEvent {
 *   constructor(
 *     public readonly supplierId: string,
 *     public readonly supplierName: string,
 *     public readonly email: string,
 *   ) {
 *     super();
 *   }
 * }
 *
 * // In aggregate:
 * const event = new SupplierCreatedEvent(supplier.id, supplier.name, supplier.email);
 * this.addDomainEvent(event);
 */
export abstract class BaseDomainEvent {
  /**
   * Unique identifier for this event instance
   * Auto-generated for event store and tracing
   */
  readonly id: string = crypto.randomUUID();

  /**
   * Timestamp when event occurred
   * Use this for event ordering and replay
   */
  readonly occurredAt: Date = new Date();

  /**
   * Version of the aggregate when this event was emitted
   * Useful for optimistic locking and event sourcing
   */
  aggregateVersion?: number;

  /**
   * Type of the aggregate that emitted this event
   * Example: "Supplier", "CashSession", "Transaction"
   */
  aggregateType?: string;

  /**
   * ID of the aggregate that emitted this event
   * Example: supplier.id, cashSession.id
   */
  aggregateId?: string;

  /**
   * Optional correlation ID for tracking related events
   * Useful for distributed tracing
   */
  correlationId?: string;

  /**
   * Optional causal ID to link cause-effect between events
   */
  causationId?: string;

  /**
   * User ID who triggered this event
   * For audit trail
   */
  userId?: string;

  /**
   * Optional metadata (context, extra data, etc.)
   */
  metadata?: Record<string, any>;
}
