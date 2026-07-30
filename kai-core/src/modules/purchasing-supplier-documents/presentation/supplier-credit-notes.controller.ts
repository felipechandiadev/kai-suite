import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { FindTransactionQuery } from '@modules/transactions/application/queries/find-transaction.query';
import {
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  applyDteNumberToSupplierDocumentDto,
  normalizeDteNumberFromBody,
} from '@modules/transactions/presentation/helpers/supplier-dte-create.helper';

@Controller('supplier-credit-notes')
export class SupplierCreditNotesController {
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
        TransactionType.SUPPLIER_CREDIT_NOTE,
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
    const purchaseReturnId = String(
      body?.metadata?.links?.purchaseReturnId ?? '',
    ).trim();
    if (!purchaseReturnId) {
      throw new BadRequestException(
        'metadata.links.purchaseReturnId es requerido (UUID de PURCHASE_RETURN)',
      );
    }

    const pr = await this.queryBus.execute(
      new FindTransactionQuery(purchaseReturnId),
    );
    if (pr.transactionType !== TransactionType.PURCHASE_RETURN) {
      throw new BadRequestException(
        'La transacción referenciada debe ser de tipo PURCHASE_RETURN',
      );
    }
    if (!body.supplierId || String(pr.supplierId) !== String(body.supplierId)) {
      throw new BadRequestException(
        'supplierId es obligatorio y debe coincidir con el de la devolución',
      );
    }
    if (body.branchId && pr.branchId && String(pr.branchId) !== String(body.branchId)) {
      throw new BadRequestException(
        'branchId no coincide con la transacción PURCHASE_RETURN referenciada',
      );
    }

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SUPPLIER_CREDIT_NOTE;
    dto.branchId = body.branchId ?? pr.branchId;
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
    dto.relatedTransactionId = purchaseReturnId;
    applyDteNumberToSupplierDocumentDto(body, dto);
    const dteNumber = normalizeDteNumberFromBody(body);
    dto.metadata = {
      ...(body.metadata ?? {}),
      origin: 'SUPPLIER_CREDIT_NOTE',
      ...(dteNumber ? { dteNumber } : {}),
      links: {
        purchaseReturnId,
        supplierInvoiceId:
          body?.metadata?.links?.supplierInvoiceId ?? null,
      },
    };
    dto.lines = Array.isArray(body.lines) ? body.lines : [];
    return this.transactionsService.createTransaction(dto);
  }
}
