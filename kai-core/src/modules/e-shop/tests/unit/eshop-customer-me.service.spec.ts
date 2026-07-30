import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EshopCustomerMeService } from '../../application/eshop-customer-me.service';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { EShopOrderStatusService } from '../../application/eshop-order-status.service';
import { CustomersService } from '@modules/customers/application/customers.service';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { CompaniesService } from '@modules/companies/application/companies.service';

describe('EshopCustomerMeService', () => {
  let service: EshopCustomerMeService;
  let orderStatus: jest.Mocked<Pick<EShopOrderStatusService, 'getOrderForCustomer'>>;

  const session = {
    accountId: 'acc-1',
    customerId: 'cust-1',
    companyId: 'co-1',
    email: 'a@test.com',
    emailVerified: true,
  };

  beforeEach(async () => {
    orderStatus = {
      getOrderForCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EshopCustomerMeService,
        { provide: getRepositoryToken(Customer), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Person), useValue: { findOne: jest.fn(), save: jest.fn() } },
        { provide: EShopOrderStatusService, useValue: orderStatus },
        { provide: CustomersService, useValue: { getPayments: jest.fn() } },
        { provide: InstallmentService, useValue: { getAccountsReceivable: jest.fn() } },
        {
          provide: CompaniesService,
          useValue: {
            getInternalCustomerCreditSettings: jest.fn(),
            getEShopFlatSettings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EshopCustomerMeService);
  });

  it('scopes order detail to authenticated customer', async () => {
    orderStatus.getOrderForCustomer.mockResolvedValue({ id: 'order-1' } as never);
    await service.getOrder('co-1', 'cust-1', 'order-1');
    expect(orderStatus.getOrderForCustomer).toHaveBeenCalledWith('co-1', 'cust-1', 'order-1');
  });

  it('does not return another customer order via order status service', async () => {
    orderStatus.getOrderForCustomer.mockRejectedValue(new NotFoundException());
    await expect(service.getOrder('co-1', 'cust-1', 'other-order')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
