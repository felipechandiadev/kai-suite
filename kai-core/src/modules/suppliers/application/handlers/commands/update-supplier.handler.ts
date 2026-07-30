import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { UpdateSupplierCommand } from '../../commands/update-supplier.command';
import { SupplierUpdatedEvent } from '../../../domain/events/supplier-updated.event';
import {
  SuppliersRepositoryPort,
  SUPPLIERS_REPOSITORY,
} from '../../ports/suppliers.repository.port';
import { Supplier } from '../../../domain/supplier.entity';
import { PersonsService } from '@modules/persons/application/persons.service';

@CommandHandler(UpdateSupplierCommand)
export class UpdateSupplierCommandHandler implements ICommandHandler<
  UpdateSupplierCommand,
  Supplier
> {
  private readonly logger = new Logger(UpdateSupplierCommandHandler.name);

  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepositoryPort,
    private readonly eventBus: EventBus,
    private readonly personsService: PersonsService,
  ) {}

  async execute(command: UpdateSupplierCommand): Promise<Supplier> {
    this.logger.debug(
      `[${command.id}] Updating supplier ${command.supplierId}`,
    );

    // Load aggregate
    const supplier = await this.repository.findOne(command.supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${command.supplierId} not found`);
    }

    const personId = supplier.personId;

    // Apply changes
    if (command.alias !== undefined) supplier.alias = command.alias;
    if (command.supplierType !== undefined)
      supplier.supplierType = command.supplierType;
    if (command.defaultPaymentTermDays !== undefined)
      supplier.defaultPaymentTermDays = command.defaultPaymentTermDays;
    if (command.isActive !== undefined) supplier.isActive = command.isActive;
    if (command.notes !== undefined) supplier.notes = command.notes;

    supplier.updatedAt = new Date();

    // Save to repository
    const updated = await this.repository.update(command.supplierId, supplier);

    if (
      command.person &&
      personId &&
      typeof command.person === 'object' &&
      Object.keys(command.person as object).length > 0
    ) {
      await this.personsService.update(personId, command.person);
    }

    // Publish domain event
    const event = new SupplierUpdatedEvent(
      command.supplierType,
      command.alias,
      command.defaultPaymentTermDays,
      command.isActive,
      command.notes,
    );

    event.aggregateId = updated.id;
    event.aggregateVersion = 2; // In real implementation, track version properly
    event.userId = command.userId;
    event.correlationId = command.id;

    this.eventBus.publish(event);
    this.logger.debug(
      `[${command.id}] Supplier ${command.supplierId} updated successfully`,
    );

    const withRelations = await this.repository.findOne(command.supplierId);
    return withRelations ?? updated;
  }
}
