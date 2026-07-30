/**
 * Base Command Class
 *
 * All commands in the application should extend this base class.
 * Commands are imperative (they request an action to be performed).
 *
 * @example
 * export class CreateSupplierCommand extends BaseCommand {
 *   constructor(
 *     public readonly name: string,
 *     public readonly email: string,
 *   ) {
 *     super();
 *   }
 * }
 */
export abstract class BaseCommand {
  /**
   * Unique identifier for this command instance
   * Auto-generated to track command execution
   */
  readonly id: string = crypto.randomUUID();

  /**
   * Timestamp when command was created
   */
  readonly timestamp: Date = new Date();

  /**
   * Optional metadata (user ID, correlation ID, etc.)
   */
  metadata?: Record<string, any>;
}
