import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerPurchasesQuery } from '../../queries/get-customer-purchases.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { saleBalanceDue } from '@modules/cash-sessions/application/collect-pending-sales.util';

@QueryHandler(GetCustomerPurchasesQuery)
export class GetCustomerPurchasesHandler implements IQueryHandler<GetCustomerPurchasesQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerPurchasesQuery) {
    const { customerId, status, page, pageSize } = query;

    const result = await this.customerRepository.getPurchases(
      customerId,
      status,
      page,
      pageSize,
    );

    const purchases = result.items.map((p) => {
      const total = Number(p.total || 0);
      const amountPaid = Number((p as { amountPaid?: number }).amountPaid ?? 0);
      return {
        id: p.id,
        documentNumber: (p as { documentNumber?: string }).documentNumber ?? null,
        transactionType: (p as { transactionType?: string }).transactionType ?? null,
        status: p.status,
        total,
        paymentMethod: (p as { paymentMethod?: string }).paymentMethod ?? null,
        paymentStatus: (p as { paymentStatus?: string }).paymentStatus ?? null,
        amountPaid,
        balanceDue: saleBalanceDue(total, amountPaid),
        createdAt: p.createdAt,
      };
    });

    return {
      success: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      purchases,
    };
  }
}
