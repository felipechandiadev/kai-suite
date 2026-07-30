import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerPendingPaymentsQuery } from '../../queries/get-customer-pending-payments.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { saleBalanceDue } from '@modules/cash-sessions/application/collect-pending-sales.util';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

@QueryHandler(GetCustomerPendingPaymentsQuery)
export class GetCustomerPendingPaymentsHandler implements IQueryHandler<GetCustomerPendingPaymentsQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerPendingPaymentsQuery) {
    const { customerId } = query;

    const pending =
      await this.customerRepository.getPendingPayments(customerId);

    // Map quotas if present; keep shape compatible with callers
    const mapped = pending
      .filter((p) => (p as { transactionType?: string }).transactionType === TransactionType.SALE)
      .map((p) => {
        const total = Number(p.total || 0);
        const amountPaid = Number((p as { amountPaid?: number }).amountPaid ?? 0);
        return {
          transactionId: p.id,
          documentNumber: (p as { documentNumber?: string }).documentNumber ?? null,
          transactionDate: p.createdAt,
          total,
          amountPaid,
          balanceDue: saleBalanceDue(total, amountPaid),
          paymentStatus: (p as { paymentStatus?: string }).paymentStatus ?? null,
          quotas: (p as { quotas?: unknown[] }).quotas || [],
        };
      });

    return mapped;
  }
}
