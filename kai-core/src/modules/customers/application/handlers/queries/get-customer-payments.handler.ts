import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerPaymentsQuery } from '../../queries/get-customer-payments.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import {
  relatedCreditNotesFromCustomerPayout,
  relatedSalesFromPaymentIn,
} from '@modules/transactions/application/payment-in-allocations.util';

@QueryHandler(GetCustomerPaymentsQuery)
export class GetCustomerPaymentsHandler implements IQueryHandler<GetCustomerPaymentsQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerPaymentsQuery) {
    const { customerId, page, pageSize } = query;

    const result = await this.customerRepository.getPaymentIns(
      customerId,
      page,
      pageSize,
    );

    const mapped = result.items.map((p) => {
      const meta =
        p.metadata && typeof p.metadata === 'object'
          ? (p.metadata as Record<string, unknown>)
          : null;
      const txType = (p as { transactionType?: string }).transactionType ?? null;
      const relatedCreditNotes = relatedCreditNotesFromCustomerPayout({
        transactionType: txType,
        metadata: meta,
      });
      const relatedSales =
        relatedCreditNotes.length > 0
          ? []
          : relatedSalesFromPaymentIn({
              relatedTransactionId: p.relatedTransactionId,
              metadata: meta,
            });
      return {
        id: p.id,
        documentNumber: (p as { documentNumber?: string }).documentNumber ?? null,
        type: txType,
        status: (p as { status?: string }).status ?? null,
        total: Number((p as { total?: number }).total ?? 0),
        paymentMethod: (p as { paymentMethod?: string }).paymentMethod ?? null,
        createdAt: p.createdAt,
        relatedSales,
        relatedCreditNotes,
      };
    });

    return {
      success: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      payments: mapped,
    };
  }
}
