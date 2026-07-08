import { Test, TestingModule } from '@nestjs/testing';
import { SearchCustomersHandler } from '@modules/customers/application/handlers/queries/search-customers.handler';
import { SearchCustomersQuery } from '@modules/customers/application/queries/search-customers.query';
import {
  CUSTOMERS_REPOSITORY,
  CustomersRepositoryPort,
} from '@modules/customers/application/ports/customers.repository.port';

describe('SearchCustomersHandler', () => {
  let handler: SearchCustomersHandler;
  let repository: jest.Mocked<CustomersRepositoryPort>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIdWithPerson: jest.fn(),
      findAll: jest.fn(),
      findAllWithPagination: jest.fn(),
      findOfflineSnapshotPage: jest.fn(),
      findByPersonId: jest.fn(),
      findByDocumentNumber: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      remove: jest.fn(),
      getTransactions: jest.fn(),
      getPendingPayments: jest.fn(),
      getPurchases: jest.fn(),
      getPaymentIns: jest.fn(),
      calculateAvailableCredit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchCustomersHandler,
        {
          provide: CUSTOMERS_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(SearchCustomersHandler);
  });

  it('should delegate search and map customers with credit math', async () => {
    const now = new Date();
    repository.findAllWithPagination.mockResolvedValueOnce({
      customers: [
        {
          id: 'customer-1',
          personId: 'person-1',
          creditLimit: 1000,
          currentBalance: 250,
          paymentDayOfMonth: 15,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as any,
      ],
      total: 1,
    });

    const result = await handler.execute(new SearchCustomersQuery('john', 2, 5));

    expect(repository.findAllWithPagination).toHaveBeenCalledWith(
      { searchQuery: 'john' },
      2,
      5,
    );
    expect(result).toEqual({
      success: true,
      page: 2,
      pageSize: 5,
      total: 1,
      customers: [
        {
          customerId: 'customer-1',
          personId: 'person-1',
          displayName: 'Display Name',
          documentNumber: 'Document',
          email: 'Email',
          phone: 'Phone',
          creditLimit: 1000,
          currentBalance: 250,
          availableCredit: 750,
          paymentDayOfMonth: 15,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
  });

  it('should preserve default paging and empty search', async () => {
    repository.findAllWithPagination.mockResolvedValueOnce({ customers: [], total: 0 });

    const result = await handler.execute(new SearchCustomersQuery());

    expect(repository.findAllWithPagination).toHaveBeenCalledWith(
      { searchQuery: '' },
      1,
      10,
    );
    expect(result).toEqual({
      success: true,
      page: 1,
      pageSize: 10,
      total: 0,
      customers: [],
    });
  });
});