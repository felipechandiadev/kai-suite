import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { AccountsPayableService } from '@modules/transactions/application/services/accounts-payable.service';
import { CreateInstallmentDto } from '@modules/installments/presentation/dto/create-installment.dto';
import {
  GetCarteraByDueDateDto,
  TransactionCarteraSummaryDto,
} from '@modules/installments/presentation/dto/installment.dto';
import { PayInstallmentDto } from '@modules/installments/presentation/dto/pay-installment.dto';

@Controller('installments')
export class InstallmentController {
  constructor(
    private readonly installmentService: InstallmentService,
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  /**
   * CENTRALIZED ACCOUNTS PAYABLE
   * Obtener todas las obligaciones de pago de la empresa
   * Incluye: Compras a proveedores, Remuneraciones, Gastos operativos
   *
   * GET /installments/accounts-payable
   * GET /installments/accounts-payable?sourceType=PURCHASE
   * GET /installments/accounts-payable?sourceType=PURCHASE,PAYROLL
   * GET /installments/accounts-payable?status=OVERDUE
   * GET /installments/accounts-payable?payeeType=SUPPLIER
   */
  @Get('accounts-payable')
  async getAccountsPayable(
    @Query('sourceType') sourceType?: string,
    @Query('status') status?: string,
    @Query('payeeType') payeeType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: any = {};

    if (sourceType) {
      filters.sourceType = sourceType.includes(',')
        ? sourceType.split(',')
        : sourceType;
    }

    if (status) {
      filters.status = status.includes(',') ? status.split(',') : status;
    }

    if (payeeType) {
      filters.payeeType = payeeType;
    }

    if (fromDate) {
      filters.fromDate = new Date(fromDate);
    }

    if (toDate) {
      filters.toDate = new Date(toDate);
    }

    const paymentType = filters.sourceType
      ? (Array.isArray(filters.sourceType)
          ? filters.sourceType
          : [filters.sourceType]
        )
          .map((st: string) => {
            if (st === 'PURCHASE') return 'SUPPLIER_PAYMENT';
            if (st === 'PAYROLL') return 'PAYROLL_PAYMENT';
            if (st === 'OPERATING_EXPENSE') return 'EXPENSE_PAYMENT';
            return st;
          })
          .join(',')
      : undefined;

    return this.accountsPayableService.list({
      paymentType: paymentType as any,
      payeeType: filters.payeeType,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      overdueOnly:
        filters.status === 'OVERDUE' ||
        (Array.isArray(filters.status) && filters.status.includes('OVERDUE')),
    });
  }

  /**
   * Obtener todas las cuotas de una transacción
   * GET /installments/transaction/:transactionId
   */
  @Get('transaction/:transactionId')
  async getInstallmentsByTransaction(
    @Param('transactionId') transactionId: string,
  ) {
    return this.installmentService.getInstallmentsByTransaction(transactionId);
  }

  /**
   * Obtener estado de cartera de una transacción
   * GET /installments/cartera/:transactionId
   */
  @Get('cartera/:transactionId')
  async getTransactionCarteraStatus(
    @Param('transactionId') transactionId: string,
  ): Promise<TransactionCarteraSummaryDto> {
    return this.installmentService.getTransactionCarteraStatus(transactionId);
  }

  /**
   * Obtener cuota por ID
   * GET /installments/:id
   */
  @Get(':id')
  async getInstallmentById(@Param('id') id: string) {
    return this.installmentService.getInstallmentById(id);
  }

  /**
   * Obtener contexto para registrar pago de una cuota
   * GET /installments/:id/context
   */
  @Get(':id/context')
  async getInstallmentPaymentContext(@Param('id') id: string) {
    return this.installmentService.getPaymentContext(id);
  }

  /**
   * Registrar pago directo de una cuota
   * POST /installments/:id/pay
   */
  @Post(':id/pay')
  async payInstallment(
    @Param('id') id: string,
    @Body() dto: PayInstallmentDto,
  ) {
    return this.installmentService.payInstallment(id, dto);
  }

  /**
   * Reporte: Cartera por vencer (entre dos fechas)
   * GET /installments/reports/cartera-by-date?fromDate=2026-02-22&toDate=2026-03-22
   */
  @Get('reports/cartera-by-date')
  async getCarteraByDueDate(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.installmentService.getCarteraByDueDate(
      new Date(fromDate),
      new Date(toDate),
    );
  }

  /**
   * Reporte: Morosidad (cuotas vencidas)
   * GET /installments/reports/overdue
   */
  @Get('reports/overdue')
  async getOverdueReport(@Query('today') today?: string) {
    return this.installmentService.getOverdueReport(
      today ? new Date(today) : undefined,
    );
  }

  /**
   * Crear cuotas para una transacción
   * POST /installments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInstallments(@Body() dto: CreateInstallmentDto) {
    return this.installmentService.createInstallmentsForTransaction(
      dto.transactionId,
      dto.totalAmount,
      dto.numberOfInstallments,
      dto.firstDueDate,
    );
  }
}
