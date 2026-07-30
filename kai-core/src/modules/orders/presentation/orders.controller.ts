import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.max(1, parseInt(limit || '25', 10) || 25);
    return this.queryBus.execute(
      new SearchTransactionsQuery(p, l, TransactionType.CUSTOMER_ORDER, status, undefined, undefined, undefined, undefined, undefined, undefined, undefined, search),
    );
  }

  @Post()
  async create(@Body() body: any) {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CUSTOMER_ORDER;
    dto.branchId = body.branchId;
    dto.userId = body.userId;
    dto.customerId = body.customerId ?? undefined;
    dto.storageId = body.storageId ?? undefined;
    dto.subtotal = Number(body.subtotal ?? 0) || 0;
    dto.taxAmount = Number(body.taxAmount ?? 0) || 0;
    dto.discountAmount = Number(body.discountAmount ?? 0) || 0;
    dto.total = Number(body.total ?? dto.subtotal ?? 0) || 0;
    dto.notes = body.notes ?? undefined;
    dto.externalReference = body.externalReference ?? undefined;
    dto.metadata = {
      ...(body.metadata ?? {}),
      origin: 'CUSTOMER_ORDER',
      links: {
        ...(body?.metadata?.links ?? {}),
      },
    };
    dto.lines = Array.isArray(body.lines) ? body.lines : [];
    return this.transactionsService.createTransaction(dto);
  }
}

