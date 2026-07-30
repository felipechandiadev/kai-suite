import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  TransactionType,
  TransactionStatus,
} from '../domain/transaction.entity';
import { SearchTransactionsQuery } from '../application/queries/search-transactions.query';
import { FindTransactionQuery } from '../application/queries/find-transaction.query';
import { CreateTransactionCommand } from '../application/commands/create-transaction.usecase';
import { CompletePaymentCommand } from '../application/commands/complete-payment.usecase';
import { CreateTransactionDto } from '../application/dto/create-transaction.dto';
import { CompletePaymentDto } from '../application/dto/complete-payment.dto';

/**
 * Controller para pagos a proveedores (wrapper sobre CQRS)
 * Filtra transacciones SUPPLIER_PAYMENT con supplierId
 */
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * GET /api/supplier-payments?limit=100&includeCancelled=false&includePaid=false
   * Lista pagos a proveedores (transacciones SUPPLIER_PAYMENT)
   *
   * Retorna formato compatible con DataGrid:
   * {
   *   rows: Transaction[],
   *   total: number,
   *   page: number,
   *   pageSize: number
   * }
   */
  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('includeCancelled') includeCancelled?: string,
    @Query('includePaid') includePaid?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const limitNum = parseInt(limit || '100', 10);
    const pageNum = parseInt(page || '1', 10);

    const searchQuery = new SearchTransactionsQuery(
      pageNum,
      limitNum,
      TransactionType.SUPPLIER_PAYMENT,
      includePaid === 'false' ? TransactionStatus.DRAFT : undefined, // status
      undefined, // paymentMethod
      undefined, // branchId
      undefined, // pointOfSaleId
      undefined, // customerId
      supplierId, // supplierId
      undefined, // dateFrom
      undefined, // dateTo
      undefined, // search
    );

    const result = await this.queryBus.execute(searchQuery);

    // Transformar al formato esperado por el DataGrid
    return {
      rows: result.data || [],
      total: result.total || 0,
      page: result.page || pageNum,
      pageSize: result.limit || limitNum,
    };
  }

  /**
   * GET /api/supplier-payments/:id
   * Obtiene un pago a proveedor específico
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new FindTransactionQuery(id));
  }

  /**
   * GET /api/supplier-payments/:id/context
   * Obtiene contexto adicional del pago (proveedor, branch, etc)
   */
  @Get(':id/context')
  async getContext(@Param('id') id: string) {
    const transaction = await this.queryBus.execute(
      new FindTransactionQuery(id),
    );

    const payment = transaction;
    const supplierAccounts = payment?.supplier?.person?.bankAccounts ?? [];
    const companyAccounts = payment?.branch?.company?.bankAccounts ?? [];
    const total = Number(payment?.total ?? 0);
    const amountPaid = Number(payment?.amountPaid ?? 0);
    const pendingAmount = Math.max(total - amountPaid, 0);

    return {
      payment: { ...payment, pendingAmount },
      supplierAccounts,
      companyAccounts,
      supplier: payment?.supplier,
      branch: payment?.branch,
    };
  }

  /**
   * POST /api/supplier-payments
   * Crea un nuevo pago a proveedor
   */
  @Post()
  async create(@Body() data: CreateTransactionDto) {
    const dto = Object.assign(new CreateTransactionDto(), {
      ...data,
      transactionType: TransactionType.SUPPLIER_PAYMENT,
    });

    return this.commandBus.execute(new CreateTransactionCommand(dto));
  }

  /**
   * PUT /api/supplier-payments/:id
   * Actualiza un pago a proveedor
   * TODO: Implementar método update en TransactionsService
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() _data: unknown) {
    throw new Error('Method not implemented. Use transactions API directly.');
  }

  /**
   * POST /api/supplier-payments/:id/complete
   * Marca un pago como completado (confirma la transacción)
   */
  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() data?: CompletePaymentDto) {
    return this.commandBus.execute(new CompletePaymentCommand(id, data || {}));
  }

  /**
   * DELETE /api/supplier-payments/:id
   * Elimina o cancela un pago a proveedor
   * TODO: Implementar método delete en TransactionsService
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    throw new Error('Method not implemented. Use transactions API directly.');
  }
}
