import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCustomerCommand } from '../../commands/delete-customer.command';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { CustomerDeletedEvent } from '@modules/customers/domain/events/customer-deleted.event';

@CommandHandler(DeleteCustomerCommand)
export class DeleteCustomerHandler implements ICommandHandler<DeleteCustomerCommand> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteCustomerCommand) {
    const { customerId, userId } = command;

    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    // Soft delete - mark as inactive
    await this.customerRepository.softDelete(customerId);

    // Emit domain event
    this.eventBus.publish(new CustomerDeletedEvent(customerId, userId));

    return { success: true, message: 'Cliente eliminado correctamente' };
  }
}
