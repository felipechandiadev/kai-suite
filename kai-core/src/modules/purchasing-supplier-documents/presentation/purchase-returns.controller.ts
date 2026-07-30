import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { FindTransactionQuery } from '@modules/transactions/application/queries/find-transaction.query';
import {
  TransactionType,
  PaymentStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';

@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly transactionsService: TransactionsService,
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
        TransactionType.PURCHASE_RETURN,
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new FindTransactionQuery(id));
  }

  @Post()
  async create(@Body() body: any) {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PURCHASE_RETURN;
    dto.branchId = body.branchId;
    dto.userId = body.userId;
    dto.supplierId = body.supplierId;
    dto.storageId = body.storageId ?? undefined;
    dto.subtotal = Number(body.subtotal ?? 0) || 0;
    dto.taxAmount = Number(body.taxAmount ?? 0) || 0;
    dto.discountAmount = Number(body.discountAmount ?? 0) || 0;
    dto.total = Number(body.total ?? 0) || 0;
    const rawPm = body.paymentMethod;
    dto.paymentMethod =
      typeof rawPm === 'string' &&
      (Object.values(PaymentMethod) as string[]).includes(rawPm)
        ? (rawPm as PaymentMethod)
        : PaymentMethod.CASH;
    const rawPs = body.paymentStatus;
    dto.paymentStatus =
      typeof rawPs === 'string' &&
      (Object.values(PaymentStatus) as string[]).includes(rawPs)
        ? (rawPs as PaymentStatus)
        : PaymentStatus.PENDING;
    dto.amountPaid = Number(body.amountPaid ?? 0) || 0;
    dto.changeAmount = body.changeAmount ?? undefined;
    dto.notes = body.notes ?? undefined;
    dto.externalReference = body.externalReference ?? undefined;
    dto.relatedTransactionId = body.relatedTransactionId ?? undefined;
    dto.metadata = {
      ...(body.metadata ?? {}),
      origin: 'PURCHASE_RETURN',
      links: {
        purchaseOrderId: body?.metadata?.links?.purchaseOrderId ?? null,
        receptionId: body?.metadata?.links?.receptionId ?? null,
        supplierInvoiceId: body?.metadata?.links?.supplierInvoiceId ?? null,
      },
    };
    dto.lines = Array.isArray(body.lines) ? body.lines : [];
    return this.transactionsService.createTransaction(dto);
  }
}
