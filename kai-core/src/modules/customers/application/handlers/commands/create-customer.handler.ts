import { Inject, ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateCustomerCommand } from '../../commands/create-customer.command';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { CustomerCreatedEvent } from '@modules/customers/domain/events/customer-created.event';

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerHandler implements ICommandHandler<CreateCustomerCommand> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateCustomerCommand) {
    const {
      personType,
      firstName,
      lastName,
      businessName,
      documentNumber,
      documentType,
      email,
      phone,
      address,
      creditLimit,
      paymentDayOfMonth,
      notes,
      userId,
    } = command;

    // Check if customer already exists by document number
    if (documentNumber) {
      const existingCustomer =
        await this.customerRepository.findByDocumentNumber(documentNumber);
      if (existingCustomer && !existingCustomer.deletedAt) {
        throw new ConflictException('Ya existe un cliente con ese documento.');
      }
    }

    // For now, create a simplified customer
    // In a full implementation, this would handle person creation/lookup
    // and all the complex business logic from the original service

    const customer = {
      personId: 'temp-person-id', // This would be created/looked up
      creditLimit: creditLimit || 0,
      currentBalance: 0,
      paymentDayOfMonth: paymentDayOfMonth || 5,
      isActive: true,
      notes: notes || undefined,
    } as any;

    const savedCustomer = await this.customerRepository.save(customer);

    // Emit domain event
    this.eventBus.publish(new CustomerCreatedEvent(savedCustomer.id, userId));

    return savedCustomer;
  }
}
