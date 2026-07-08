import { Test, TestingModule } from '@nestjs/testing';
import { GetCustomerHandler } from '@modules/customers/application/handlers/queries/get-customer.handler';
import { GetCustomerQuery } from '@modules/customers/application/queries/get-customer.query';
import {
  CUSTOMERS_REPOSITORY,
  CustomersRepositoryPort,
} from '@modules/customers/application/ports/customers.repository.port';

describe('GetCustomerHandler', () => {
  let handler: GetCustomerHandler;
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
        GetCustomerHandler,
        {
          provide: CUSTOMERS_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetCustomerHandler);
  });

  it('should return null when customer does not exist', async () => {
    repository.findByIdWithPerson.mockResolvedValueOnce(null);

    const result = await handler.execute(new GetCustomerQuery('missing'));

    expect(repository.findByIdWithPerson).toHaveBeenCalledWith('missing');
    expect(repository.calculateAvailableCredit).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should build customer response with calculated credit info', async () => {
    const now = new Date();
    repository.findByIdWithPerson.mockResolvedValueOnce({
      id: 'customer-1',
      personId: 'person-1',
      paymentDayOfMonth: 15,
      isActive: true,
      notes: 'notes',
      createdAt: now,
      updatedAt: now,
    } as any);
    repository.calculateAvailableCredit.mockResolvedValueOnce({
      creditLimit: 1000,
      usedCredit: 200,
      availableCredit: 800,
    });

    const result = await handler.execute(new GetCustomerQuery('customer-1'));

    expect(repository.findByIdWithPerson).toHaveBeenCalledWith('customer-1');
    expect(repository.calculateAvailableCredit).toHaveBeenCalledWith('customer-1');
    expect(result).toEqual({
      customerId: 'customer-1',
      personId: 'person-1',
      displayName: 'Display Name',
      documentType: 'Document Type',
      documentNumber: 'Document Number',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      creditLimit: 1000,
      usedCredit: 200,
      availableCredit: 800,
      paymentDayOfMonth: 15,
      isActive: true,
      notes: 'notes',
      createdAt: now,
      updatedAt: now,
    });
  });
});