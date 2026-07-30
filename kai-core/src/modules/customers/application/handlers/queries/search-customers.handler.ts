import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchCustomersQuery } from '../../queries/search-customers.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';

@QueryHandler(SearchCustomersQuery)
export class SearchCustomersHandler implements IQueryHandler<SearchCustomersQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: SearchCustomersQuery) {
    const { query: searchQuery = '', page = 1, pageSize = 10 } = query;

    const result = await this.customerRepository.findAllWithPagination(
      { searchQuery },
      page,
      pageSize,
    );

    const customers = result.customers.map((c) => ({
      customerId: c.id,
      personId: c.personId,
      displayName: 'Display Name', // This would need person data
      documentNumber: 'Document', // This would need person data
      email: 'Email', // This would need person data
      phone: 'Phone', // This would need person data
      creditLimit: Number(c.creditLimit || 0),
      currentBalance: Number(c.currentBalance || 0),
      availableCredit: Math.max(
        0,
        Number(c.creditLimit || 0) - Number(c.currentBalance || 0),
      ),
      paymentDayOfMonth: c.paymentDayOfMonth || null,
      isActive: !!c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      success: true,
      page,
      pageSize,
      total: result.total,
      customers,
    };
  }
}
