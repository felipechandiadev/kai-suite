import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { FindTransactionQuery } from '@modules/transactions/application/queries/find-transaction.query';
import { TransactionType, PaymentStatus } from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  applyDteNumberToSupplierDocumentDto,
  normalizeDteNumberFromBody,
} from '@modules/transactions/presentation/helpers/supplier-dte-create.helper';

@Controller('supplier-guides')
export class SupplierGuidesController {
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
        TransactionType.SUPPLIER_GUIDE,
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
    dto.transactionType = TransactionType.SUPPLIER_GUIDE;
    dto.branchId = body.branchId;
    dto.userId = body.userId;
    dto.supplierId = body.supplierId;
    dto.storageId = body.storageId ?? undefined;
    dto.subtotal = Number(body.subtotal ?? 0) || 0;
    dto.taxAmount = Number(body.taxAmount ?? 0) || 0;
    dto.discountAmount = Number(body.discountAmount ?? 0) || 0;
    dto.total = Number(body.total ?? 0) || 0;
    dto.paymentMethod = body.paymentMethod;
    dto.paymentStatus = body.paymentStatus as PaymentStatus | undefined;
    dto.amountPaid = Number(body.amountPaid ?? 0) || 0;
    dto.changeAmount = body.changeAmount ?? undefined;
    dto.notes = body.notes ?? undefined;
    dto.externalReference = body.externalReference ?? undefined;
    dto.relatedTransactionId = body.relatedTransactionId ?? undefined;
    applyDteNumberToSupplierDocumentDto(body, dto);
    const dteNumber = normalizeDteNumberFromBody(body);
    dto.metadata = {
      ...(body.metadata ?? {}),
      origin: 'SUPPLIER_GUIDE',
      ...(dteNumber ? { dteNumber } : {}),
      links: {
        purchaseOrderId: body?.metadata?.links?.purchaseOrderId ?? null,
        receptionId: body?.metadata?.links?.receptionId ?? null,
        stockInTransactionId: body?.metadata?.links?.stockInTransactionId ?? null,
      },
    };
    dto.lines = Array.isArray(body.lines) ? body.lines : [];
    return this.transactionsService.createTransaction(dto);
  }
}
