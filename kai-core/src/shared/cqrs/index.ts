/**
 * CQRS Foundation Classes
 *
 * This module provides base classes for implementing the CQRS pattern
 * across the entire Flow Store backend.
 *
 * CQRS = Command Query Responsibility Segregation
 *
 * Key Concepts:
 * - Commands: Write operations (CreateSupplier, OpenCashSession, etc.)
 * - Queries: Read operations (GetSuppliers, GetCashSessionBalance, etc.)
 * - Domain Events: Facts that happened (SupplierCreated, PaymentProcessed, etc.)
 *
 * @see https://martinfowler.com/bliki/CQRS.html
 * @see https://docs.nestjs.com/recipes/cqrs
 */

export { BaseCommand } from './base.command';
export { BaseQuery } from './base.query';
export { BaseDomainEvent } from './base.domain-event';

/**
 * Usage Example:
 *
 * 1. Create a Command:
 *    ```
 *    export class CreateSupplierCommand extends BaseCommand {
 *      constructor(public readonly name: string, public readonly email: string) {
 *        super();
 *      }
 *    }
 *    ```
 *
 * 2. Create a Command Handler:
 *    ```
 *    @CommandHandler(CreateSupplierCommand)
 *    export class CreateSupplierCommandHandler
 *      implements ICommandHandler<CreateSupplierCommand> {
 *      execute(command: CreateSupplierCommand) {
 *        // Business logic here
 *        // Emit domain events
 *      }
 *    }
 *    ```
 *
 * 3. Create a Domain Event:
 *    ```
 *    export class SupplierCreatedEvent extends BaseDomainEvent {
 *      constructor(
 *        public readonly supplierId: string,
 *        public readonly supplierName: string,
 *      ) {
 *        super();
 *      }
 *    }
 *    ```
 *
 * 4. Create Event Handler (reacts to events):
 *    ```
 *    @EventsHandler(SupplierCreatedEvent)
 *    export class UpdateAccountingOnSupplierCreatedHandler
 *      implements IEventHandler<SupplierCreatedEvent> {
 *      handle(event: SupplierCreatedEvent) {
 *        // Update accounting when supplier is created
 *      }
 *    }
 *    ```
 */
