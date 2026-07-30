import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CustomersServiceAdapter } from '@modules/customers/application/customers.service.adapter';
import { CustomersService } from '@modules/customers/application/customers.service';
import { UpdateCustomerCommand } from '@modules/customers/application/commands/update-customer.command';
import { DeleteCustomerCommand } from '@modules/customers/application/commands/delete-customer.command';
import { GetCustomerPaymentsQuery } from '@modules/customers/application/queries/get-customer-payments.query';
import { GetCustomerPendingPaymentsQuery } from '@modules/customers/application/queries/get-customer-pending-payments.query';
import { GetCustomerPurchasesQuery } from '@modules/customers/application/queries/get-customer-purchases.query';

describe('CustomersServiceAdapter', () => {
  let service: CustomersServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let customersCore: { create: jest.Mock; findOne: jest.Mock; search: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    customersCore = {
      create: jest.fn(),
      findOne: jest.fn(),
      search: jest.fn(),
    };

    service = new CustomersServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      customersCore as unknown as CustomersService,
    );
  });

  it('should delegate create to CustomersService', async () => {
    const payload = { personType: 'NATURAL', firstName: 'John' };
    const out = { success: true, customer: { customerId: 'c1' } };
    customersCore.create.mockResolvedValueOnce(out);

    const result = await service.create(payload);

    expect(customersCore.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(out);
  });

  it('should dispatch UpdateCustomerCommand and map response', async () => {
    commandBus.execute.mockResolvedValueOnce({});
    const full = {
      customerId: 'customer-1',
      personId: 'p1',
      displayName: 'Jane Doe',
      creditLimit: 500,
      paymentDayOfMonth: 20,
      isActive: true,
      usedCredit: 0,
      availableCredit: 500,
    };
    customersCore.findOne.mockResolvedValueOnce(full);

    const result = await service.update('customer-1', {
      creditLimit: 500,
      paymentDayOfMonth: 20,
      notes: 'updated',
      isActive: true,
    });

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateCustomerCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      customerId: 'customer-1',
      userId: 'system-user',
      creditLimit: 500,
      paymentDayOfMonth: 20,
      notes: 'updated',
      isActive: true,
    });
    expect(customersCore.findOne).toHaveBeenCalledWith('customer-1');
    expect(result).toEqual({ success: true, customer: full });
  });

  it('should dispatch DeleteCustomerCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.delete('customer-1');

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(DeleteCustomerCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      customerId: 'customer-1',
      userId: 'system-user',
    });
  });

  it('should delegate findOne and search to CustomersService', async () => {
    customersCore.findOne.mockResolvedValueOnce({ customerId: 'x' });
    customersCore.search.mockResolvedValueOnce({ success: true, total: 0, customers: [] });

    await service.findOne('customer-1');
    await service.getPayments('customer-1');
    await service.search({ query: 'john', page: 2, pageSize: 5 });
    await service.getPendingPayments('customer-1');
    await service.getPurchases('customer-1', 'PAID');

    expect(customersCore.findOne).toHaveBeenCalledWith('customer-1');
    expect(customersCore.search).toHaveBeenCalledWith({ query: 'john', page: 2, pageSize: 5 });
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetCustomerPaymentsQuery);
    expect(queryBus.execute.mock.calls[1][0]).toBeInstanceOf(GetCustomerPendingPaymentsQuery);
    expect(queryBus.execute.mock.calls[2][0]).toBeInstanceOf(GetCustomerPurchasesQuery);
    expect(queryBus.execute.mock.calls[2][0]).toMatchObject({
      customerId: 'customer-1',
      status: 'PAID',
    });
  });
});
