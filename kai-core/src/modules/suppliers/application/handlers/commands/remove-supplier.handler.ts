import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { RemoveSupplierCommand } from '../../commands/remove-supplier.command';
import { SupplierRemovedEvent } from '../../../domain/events/supplier-removed.event';
import {
  SuppliersRepositoryPort,
  SUPPLIERS_REPOSITORY,
} from '../../ports/suppliers.repository.port';

@CommandHandler(RemoveSupplierCommand)
export class RemoveSupplierCommandHandler implements ICommandHandler<
  RemoveSupplierCommand,
  void
> {
  private readonly logger = new Logger(RemoveSupplierCommandHandler.name);

  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveSupplierCommand): Promise<void> {
    this.logger.debug(
      `[${command.id}] Removing supplier ${command.supplierId}`,
    );

    // Load aggregate
    const supplier = await this.repository.findOne(command.supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${command.supplierId} not found`);
    }

    // Remove from repository
    await this.repository.remove(command.supplierId);

    // Publish domain event
    const event = new SupplierRemovedEvent(command.reason);
    event.aggregateId = command.supplierId;
    event.aggregateVersion = 3; // In real implementation, track version properly
    event.userId = command.userId;
    event.correlationId = command.id;

    this.eventBus.publish(event);
    this.logger.debug(
      `[${command.id}] Supplier ${command.supplierId} removed successfully`,
    );
  }
}
