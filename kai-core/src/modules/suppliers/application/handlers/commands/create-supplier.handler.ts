import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateSupplierCommand } from '../../commands/create-supplier.command';
import { SupplierCreatedEvent } from '../../../domain/events/supplier-created.event';
import {
  SuppliersRepositoryPort,
  SUPPLIERS_REPOSITORY,
} from '../../ports/suppliers.repository.port';
import { Supplier } from '../../../domain/supplier.entity';
import { v4 as uuid } from 'uuid';

@CommandHandler(CreateSupplierCommand)
export class CreateSupplierCommandHandler implements ICommandHandler<
  CreateSupplierCommand,
  Supplier
> {
  private readonly logger = new Logger(CreateSupplierCommandHandler.name);

  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateSupplierCommand): Promise<Supplier> {
    this.logger.debug(
      `[${command.id}] Creating supplier for person ${command.personId}`,
    );

    const supplier: any = {
      id: uuid(),
      personId: command.personId,
      supplierType: command.supplierType,
      defaultPaymentTermDays: command.defaultPaymentTermDays,
      alias: command.alias,
      notes: command.notes,
      isActive: true,
    };

    // Save to repository
    const saved = await this.repository.create(supplier);

    // Publish domain event
    const event = new SupplierCreatedEvent(
      saved.supplierType,
      saved.personId,
      saved.defaultPaymentTermDays,
      saved.alias,
      saved.isActive,
    );

    event.aggregateId = saved.id;
    event.aggregateVersion = 1;
    event.userId = command.userId;
    event.correlationId = command.id;

    this.eventBus.publish(event);
    this.logger.debug(
      `[${command.id}] Supplier ${saved.id} created successfully`,
    );

    return saved;
  }
}
