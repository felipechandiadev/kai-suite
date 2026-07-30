import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerQuery } from '../../queries/get-customer.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';

@QueryHandler(GetCustomerQuery)
export class GetCustomerHandler implements IQueryHandler<GetCustomerQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerQuery) {
    const { customerId } = query;

    const customer =
      await this.customerRepository.findByIdWithPerson(customerId);
    if (!customer) return null;

    const creditInfo =
      await this.customerRepository.calculateAvailableCredit(customerId);

    return {
      customerId: customer.id,
      personId: customer.personId,
      displayName: 'Display Name', // This would need person data
      documentType: 'Document Type', // This would need person data
      documentNumber: 'Document Number', // This would need person data
      email: 'Email', // This would need person data
      phone: 'Phone', // This would need person data
      address: 'Address', // This would need person data
      creditLimit: creditInfo.creditLimit,
      usedCredit: creditInfo.usedCredit,
      availableCredit: creditInfo.availableCredit,
      paymentDayOfMonth: customer.paymentDayOfMonth,
      isActive: !!customer.isActive,
      notes: customer.notes || null,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
