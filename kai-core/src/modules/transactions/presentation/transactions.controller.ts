import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { CurrentUser, CurrentUserPayload } from '@common/tenant';
import { PosSaleLookupService } from '../application/pos-sale-lookup.service';
import { PosBackorderLookupService } from '../application/pos-backorder-lookup.service';
import { PosSaleReceiptPrintService } from '../application/pos-sale-receipt-print.service';
import { FiscalBoletaEmissionService } from '@modules/fiscal/application/fiscal-boleta-emission.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { SearchTransactionsQuery } from '../application/queries/search-transactions.query';
import { ListJournalQuery } from '../application/queries/list-journal.query';
import { FindTransactionQuery } from '../application/queries/find-transaction.query';
import { SearchTransactionsDto } from '../application/dto/search-transactions.dto';
import {
  TransactionType,
  TransactionStatus,
} from '../domain/transaction.entity';
import { CancelBackorderService } from '../application/cancel-backorder.service';
import { CancelBackorderDto } from '../application/dto/cancel-backorder.dto';
import { VoidSaleService } from '../application/void-sale.service';
import { VoidSaleDto } from '../application/dto/void-sale.dto';
import { UserRole } from '@modules/users/domain/user.entity';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly posSaleLookup: PosSaleLookupService,
    private readonly posBackorderLookup: PosBackorderLookupService,
    private readonly posSaleReceiptPrint: PosSaleReceiptPrintService,
    private readonly fiscalBoletaEmission: FiscalBoletaEmissionService,
    private readonly cancelBackorderService: CancelBackorderService,
    private readonly voidSaleService: VoidSaleService,
  ) {}

  /**
   * Si `forcedTransactionTypes` tiene elementos, fija el filtro IN y omite `type` / `types`
   * del query string (endpoints dedicados ventas / devoluciones cliente).
   */
  private executeTransactionSearch(
    query: SearchTransactionsDto,
    forcedTransactionTypes?: string[],
  ) {
    const transactionTypes =
      forcedTransactionTypes ??
      (query.types && String(query.types).trim()
        ? String(query.types)
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : undefined);

    const singleType =
      forcedTransactionTypes && forcedTransactionTypes.length > 0
        ? undefined
        : query.type;

    return this.queryBus.execute(
      new SearchTransactionsQuery(
        query.page,
        query.limit || query.pageSize,
        singleType,
        query.status,
        query.paymentMethod,
        query.branchId,
        query.pointOfSaleId,
        query.customerId,
        query.supplierId,
        query.dateFrom,
        query.dateTo,
        query.search,
        query.bankAccountKey,
        query.cashHubId,
        transactionTypes,
      ),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Search transactions',
    description: 'Search and filter transactions with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 25,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'SALE',
      'PURCHASE',
      'PAYMENT_IN',
      'SUPPLIER_PAYMENT',
      'PAYROLL_PAYMENT',
      'BANK_TO_CASH_TRANSFER',
      'ADJUSTMENT',
      'VOID_ADJUSTMENT',
    ],
    description: 'Filter by transaction type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'VOIDED'],
    description: 'Filter by transaction status',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-1234' },
              type: { type: 'string', example: 'SALE' },
              status: { type: 'string', example: 'COMPLETED' },
              total: { type: 'number', example: 150000 },
              createdAt: { type: 'string', format: 'date-time' },
              customer: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() query: SearchTransactionsDto) {
    return this.executeTransactionSearch(query);
  }

  @Get('sales')
  @ApiOperation({
    summary: 'Ventas a cliente (SALE)',
    description:
      'Solo transacciones `SALE`. Mismos query params que GET /transactions; se ignoran `type` y `types`.',
  })
  async listSales(@Query() query: SearchTransactionsDto) {
    return this.executeTransactionSearch(query, [TransactionType.SALE]);
  }

  @Get('sales/by-document-number/:documentNumber')
  @ApiOperation({
    summary: 'Buscar venta por folio interno (POS devolución)',
    description:
      'Devuelve venta `SALE` con líneas para cargar carrito de devolución en el POS. `sale: null` si no existe.',
  })
  async getSaleByDocumentNumber(
    @Param('documentNumber') documentNumber: string,
    @CurrentCompany() companyId: string,
  ) {
    const sale = await this.posSaleLookup.findSaleByDocumentNumber(
      companyId,
      documentNumber,
    );
    return { success: true, sale };
  }

  @Get('backorders/by-document-number/:documentNumber')
  @ApiOperation({
    summary: 'Buscar reserva (encargo) por folio interno (POS)',
    description:
      'Devuelve transacción `BACKORDER` abierta con líneas para liquidar en el POS. `backorder: null` si no existe.',
  })
  async getBackorderByDocumentNumber(
    @Param('documentNumber') documentNumber: string,
    @CurrentCompany() companyId: string,
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ) {
    const backorder = await this.posBackorderLookup.findBackorderByDocumentNumber(
      companyId,
      documentNumber,
      pointOfSaleId,
    );
    return { success: true, backorder };
  }

  @Get('customer-returns')
  @ApiOperation({
    summary: 'Devoluciones de venta a cliente (SALE_RETURN)',
    description:
      'Solo transacciones `SALE_RETURN`. Mismos query params que GET /transactions; se ignoran `type` y `types`.',
  })
  async listCustomerReturns(@Query() query: SearchTransactionsDto) {
    return this.executeTransactionSearch(query, [
      TransactionType.SALE_RETURN,
    ]);
  }

  @Get('customer-credit-notes')
  @ApiOperation({
    summary: 'Notas de crédito a cliente (CUSTOMER_CREDIT_NOTE)',
    description:
      'Solo transacciones `CUSTOMER_CREDIT_NOTE`. Mismos query params que GET /transactions; se ignoran `type` y `types`.',
  })
  async listCustomerCreditNotes(@Query() query: SearchTransactionsDto) {
    return this.executeTransactionSearch(query, [
      TransactionType.CUSTOMER_CREDIT_NOTE,
    ]);
  }

  @Get('backorders')
  @ApiOperation({
    summary: 'Encargos / reservas (BACKORDER)',
    description:
      'Solo transacciones `BACKORDER`. Mismos query params que GET /transactions; se ignoran `type` y `types`.',
  })
  async listBackorders(@Query() query: SearchTransactionsDto) {
    return this.executeTransactionSearch(query, [TransactionType.BACKORDER]);
  }

  @Post('backorders/:id/cancel')
  @ApiOperation({
    summary: 'Anular encargo (BACKORDER)',
    description:
      'Solo encargos abiertos. Libera stock reservado; si hay abono no consumido, emite CUSTOMER_CREDIT_NOTE.',
  })
  @ApiParam({ name: 'id', description: 'UUID del encargo' })
  async cancelBackorder(
    @Param('id') id: string,
    @Body() body: CancelBackorderDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.cancelBackorderService.cancel(
      companyId,
      user.id,
      id,
      body,
    );
    return { success: true, ...result };
  }

  @Post('sales/:id/void')
  @ApiOperation({
    summary: 'Anular venta (SALE) operativa',
    description:
      'Anula una venta no fiscal: marca VOIDED, anula cobros hijos, restaura stock y registra VOID_ADJUSTMENT. Bloquea boleta/factura y ventas con devoluciones.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la venta' })
  async voidSale(
    @Param('id') id: string,
    @Body() body: VoidSaleDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.voidSaleService.void(
      companyId,
      user.id,
      id,
      body,
    );
    return { success: true, ...result };
  }

  @Get('journal')
  @ApiOperation({
    summary: 'Get transaction journal',
    description: 'Get paginated transaction journal with advanced filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 25,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'SALE',
      'PURCHASE',
      'PAYMENT_IN',
      'SUPPLIER_PAYMENT',
      'PAYROLL_PAYMENT',
      'BANK_TO_CASH_TRANSFER',
      'ADJUSTMENT',
      'VOID_ADJUSTMENT',
    ],
    description: 'Filter by transaction type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'VOIDED'],
    description: 'Filter by transaction status',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date filter (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date filter (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction journal retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              status: { type: 'string' },
              total: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              branch: { type: 'object' },
              pointOfSale: { type: 'object' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async listJournal(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('filters') filters?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    // Convertir a números
    const pageNum = parseInt(page || '1', 10);
    const pageSizeNum = parseInt(pageSize || limit || '25', 10);

    return this.queryBus.execute(
      new ListJournalQuery(
        pageNum,
        pageSizeNum,
        type as TransactionType,
        status as TransactionStatus,
        dateFrom,
        dateTo,
        search,
      ),
    );
  }

  @Get(':id/pos-sale-receipt')
  @ApiOperation({
    summary: 'Datos para reimprimir comprobante POS (ticket / documento)',
    description:
      'Venta `SALE` o encargo `BACKORDER` con líneas, pagos y promociones para reimpresión en el POS.',
  })
  async getPosSaleReceipt(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('scope') scope?: 'full' | 'non_dte',
  ) {
    const receipt = await this.posSaleReceiptPrint.findReceiptByTransactionId(
      companyId,
      id,
      {
        scope: scope === 'non_dte' ? 'non_dte' : 'full',
        allowedCompanyIds: (user.memberships ?? []).map((m) => m.companyId),
        isSuperAdmin: user.rol === UserRole.SUPER_ADMIN,
      },
    );
    return { success: true, receipt };
  }

  @Get(':id/fiscal-emission-status')
  @ApiOperation({ summary: 'Estado de emisión boleta SII para una venta' })
  async getFiscalEmissionStatus(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const status = await this.fiscalBoletaEmission.getEmissionStatusForTransaction(
      companyId,
      id,
    );
    if (!status) {
      return { success: false, message: 'No hay emisión fiscal para esta venta' };
    }
    return { success: true, status };
  }

  @Get(':id/fiscal-boleta-print-preview')
  @ApiOperation({
    summary: 'Vista previa boleta electrónica SII para reimpresión POS',
  })
  async getFiscalBoletaPrintPreview(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const preview = await this.fiscalBoletaEmission.getPrintPreviewForTransaction(
      companyId,
      id,
    );
    if (!preview) {
      return { success: false, message: 'No hay boleta fiscal disponible para esta venta' };
    }
    return { success: true, preview };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description: 'Retrieve detailed information about a specific transaction',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: 'uuid-1234-5678-9012',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        total: { type: 'number' },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        discount: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time' },
        customer: { type: 'object' },
        branch: { type: 'object' },
        pointOfSale: { type: 'object' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              product: { type: 'object' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new FindTransactionQuery(id));
  }
}
