import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { FindTransactionQuery } from '@modules/transactions/application/queries/find-transaction.query';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { SupplierFiscalDocumentPaymentAggregateService } from '@modules/transactions/application/services/supplier-fiscal-document-payment-aggregate.service';
import { SupplierFiscalDocumentCreateService } from '@modules/transactions/application/services/supplier-fiscal-document-create.service';

@Controller('supplier-invoices')
export class SupplierInvoicesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly supplierDocumentPaymentAggregate: SupplierFiscalDocumentPaymentAggregateService,
    private readonly supplierFiscalDocumentCreate: SupplierFiscalDocumentCreateService,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.max(1, parseInt(limit || '25', 10) || 25);
    return this.queryBus.execute(
      new SearchTransactionsQuery(
        p,
        l,
        TransactionType.SUPPLIER_INVOICE,
        status as any,
        undefined,
        undefined,
        undefined,
        undefined,
        supplierId,
        undefined,
        undefined,
        search,
      ),
    );
  }

  @Get(':id/payment-state')
  async paymentState(@Param('id') id: string) {
    return this.supplierDocumentPaymentAggregate.getAggregate(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new FindTransactionQuery(id));
  }

  @Post()
  async create(@Body() body: any) {
    return this.supplierFiscalDocumentCreate.createFromHttpBody({
      ...body,
      transactionType: TransactionType.SUPPLIER_INVOICE,
      paymentOrigin: 'SUPPLIER_INVOICE_PAYMENT',
      metadata: {
        ...(body.metadata ?? {}),
        origin: 'SUPPLIER_INVOICE',
        links: {
          purchaseOrderId: body?.metadata?.links?.purchaseOrderId ?? null,
          receptionId: body?.metadata?.links?.receptionId ?? null,
          stockInTransactionId: body?.metadata?.links?.stockInTransactionId ?? null,
        },
      },
    });
  }
}
