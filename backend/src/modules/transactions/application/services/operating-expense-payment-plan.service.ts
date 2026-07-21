import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';
import {
  SupplierDocumentPaymentPlanService,
  SupplierDocumentPaymentPlanInput,
} from './supplier-document-payment-plan.service';
import { ParentPaymentAggregateService } from './parent-payment-aggregate.service';
import { SupplierDocumentFolioGuardService } from './supplier-document-folio-guard.service';

export type CreateOperatingExpenseWithPaymentInput = {
  companyId: string;
  branchId: string;
  userId: string;
  supplierId: string;
  expenseCategoryId: string;
  operationalExpenseId: string;
  documentFolio: string;
  operationDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  supplierDocumentPayment: unknown;
  skipFolioCheck?: boolean;
};

export type CreateOperatingExpenseWithPaymentResult = {
  operatingExpenseTransactionId: string;
  paymentStatus: PaymentStatus;
};

@Injectable()
export class OperatingExpensePaymentPlanService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly supplierDocumentPaymentPlan: SupplierDocumentPaymentPlanService,
    private readonly parentPaymentAggregate: ParentPaymentAggregateService,
    private readonly folioGuard: SupplierDocumentFolioGuardService,
  ) {}

  async createWithPaymentPlan(
    input: CreateOperatingExpenseWithPaymentInput,
  ): Promise<CreateOperatingExpenseWithPaymentResult> {
    const totalDoc = Math.round(Number(input.total) || 0);
    if (totalDoc <= 0) {
      throw new BadRequestException('El total del gasto debe ser mayor a cero.');
    }

    const folio = String(input.documentFolio || '').trim();
    if (!folio) {
      throw new BadRequestException('La referencia del documento es obligatoria.');
    }

    if (!input.skipFolioCheck) {
      await this.folioGuard.assertUniqueFolio({
        companyId: input.companyId,
        supplierId: input.supplierId,
        documentFolio: folio,
        transactionTypes: this.folioGuard.allFolioTypesForOperationalExpense(),
      });
    }

    const payment = this.supplierDocumentPaymentPlan.normalize(
      input.supplierDocumentPayment ?? null,
    );
    const planErr = this.supplierDocumentPaymentPlan.validate(payment, totalDoc);
    if (planErr) {
      throw new BadRequestException(planErr);
    }

    const parentFields = this.supplierDocumentPaymentPlan.resolveFiscalParentFields(
      payment,
      totalDoc,
    );

    const opDto = new CreateTransactionDto();
    opDto.transactionType = TransactionType.OPERATING_EXPENSE;
    opDto.branchId = input.branchId;
    opDto.userId = input.userId;
    opDto.expenseCategoryId = input.expenseCategoryId;
    opDto.supplierId = input.supplierId;
    opDto.subtotal = Math.round(Number(input.subtotal) || 0);
    opDto.taxAmount = Math.round(Number(input.taxAmount) || 0);
    opDto.discountAmount = 0;
    opDto.total = totalDoc;
    if (parentFields.paymentMethod) {
      opDto.paymentMethod = parentFields.paymentMethod;
    }
    opDto.amountPaid = parentFields.amountPaid;
    opDto.paymentStatus = parentFields.paymentStatus;
    opDto.paymentDueDate = input.operationDate;
    opDto.documentFolio = folio;
    opDto.externalReference = folio;
    opDto.metadata = {
      origin: 'OPERATIONAL_EXPENSE',
      operationalExpenseId: input.operationalExpenseId,
      documentKind: 'OTHER',
      plannedPayments: parentFields.plannedPayments,
      supplierDocumentPayment: payment,
      links: {
        operationalExpenseId: input.operationalExpenseId,
      },
    };

    const opTx = await this.transactionsService.createTransaction(opDto);
    const opTxId = opTx?.id;
    if (!opTxId) {
      throw new BadRequestException('No se obtuvo id del gasto operativo contable.');
    }

    await this.createExpensePaymentChildren({
      host: {
        branchId: input.branchId,
        userId: input.userId,
        supplierId: input.supplierId,
        expenseCategoryId: input.expenseCategoryId,
        operationalExpenseId: input.operationalExpenseId,
      },
      operatingExpenseTransactionId: opTxId,
      payment,
      operationDate: input.operationDate,
    });

    if (this.shouldRecalculateParent(payment)) {
      await this.parentPaymentAggregate.recalculateParentPaymentStatus(opTxId);
    }

    const refreshed = await this.transactionsService.findOne(opTxId);
    return {
      operatingExpenseTransactionId: opTxId,
      paymentStatus:
        (refreshed?.paymentStatus as PaymentStatus) ?? parentFields.paymentStatus,
    };
  }

  private shouldRecalculateParent(
    payment: SupplierDocumentPaymentPlanInput,
  ): boolean {
    if (payment.mode === 'PENDING') {
      return false;
    }
    if (payment.mode === 'COMPLETED') {
      return payment.paidLines.length > 0;
    }
    if (payment.mode === 'PARTIAL') {
      return payment.paidLines.length + payment.scheduledLines.length > 0;
    }
    if (payment.mode === 'PENDING_SCHEDULED') {
      return payment.scheduledLines.length > 0;
    }
    return false;
  }

  private async createExpensePaymentChildren(opts: {
    host: {
      branchId: string;
      userId: string;
      supplierId: string;
      expenseCategoryId: string;
      operationalExpenseId: string;
    };
    operatingExpenseTransactionId: string;
    payment: SupplierDocumentPaymentPlanInput;
    operationDate: string;
  }): Promise<void> {
    const { payment, operatingExpenseTransactionId, host, operationDate } = opts;
    const paid = payment.paidLines;
    const sched = payment.scheduledLines;

    const totalPaymentLines =
      payment.mode === 'COMPLETED'
        ? paid.length
        : payment.mode === 'PARTIAL'
          ? paid.length + sched.length
          : payment.mode === 'PENDING_SCHEDULED'
            ? sched.length
            : 0;

    if (payment.mode === 'COMPLETED') {
      for (let i = 0; i < paid.length; i++) {
        await this.createExpensePaymentLine({
          host,
          operatingExpenseTransactionId,
          line: paid[i],
          asDraft: false,
          note: `Pago gasto operativo (${i + 1}/${paid.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines || paid.length,
          defaultDueDate: operationDate,
        });
      }
      return;
    }

    if (payment.mode === 'PARTIAL') {
      for (let i = 0; i < paid.length; i++) {
        await this.createExpensePaymentLine({
          host,
          operatingExpenseTransactionId,
          line: paid[i],
          asDraft: false,
          note: `Abono gasto operativo (${i + 1}/${paid.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines,
          defaultDueDate: operationDate,
        });
      }
      for (let i = 0; i < sched.length; i++) {
        await this.createExpensePaymentLine({
          host,
          operatingExpenseTransactionId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada (${i + 1}/${sched.length})`,
          installmentNumber: paid.length + i + 1,
          totalInstallments: totalPaymentLines,
          defaultDueDate: operationDate,
        });
      }
      return;
    }

    if (payment.mode === 'PENDING_SCHEDULED') {
      for (let i = 0; i < sched.length; i++) {
        await this.createExpensePaymentLine({
          host,
          operatingExpenseTransactionId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada (${i + 1}/${sched.length})`,
          installmentNumber: i + 1,
          totalInstallments: sched.length,
          defaultDueDate: operationDate,
        });
      }
    }
  }

  private async createExpensePaymentLine(opts: {
    host: {
      branchId: string;
      userId: string;
      supplierId: string;
      expenseCategoryId: string;
      operationalExpenseId: string;
    };
    operatingExpenseTransactionId: string;
    line: Record<string, unknown>;
    asDraft: boolean;
    note: string;
    installmentNumber: number;
    totalInstallments: number;
    defaultDueDate: string;
  }): Promise<void> {
    const amount = Math.round(Number(opts.line.amount) || 0);
    if (amount <= 0) {
      return;
    }

    const payDto = new CreateTransactionDto();
    payDto.transactionType = TransactionType.EXPENSE_PAYMENT;
    if (opts.asDraft) {
      payDto.transactionStatus = TransactionStatus.DRAFT;
    }
    payDto.branchId = opts.host.branchId;
    payDto.userId = opts.host.userId;
    payDto.expenseCategoryId = opts.host.expenseCategoryId;
    payDto.supplierId = opts.host.supplierId;
    payDto.relatedTransactionId = opts.operatingExpenseTransactionId;
    payDto.subtotal = amount;
    payDto.taxAmount = 0;
    payDto.discountAmount = 0;
    payDto.total = amount;
    payDto.amountPaid = opts.asDraft ? 0 : amount;
    payDto.paymentStatus = opts.asDraft
      ? PaymentStatus.PENDING
      : PaymentStatus.PAID;
    payDto.paymentDueDate = String(opts.line.dueDate || opts.defaultDueDate).trim();

    const pm = String(opts.line.paymentMethod || '').toUpperCase();
    if (pm && ['CASH', 'TRANSFER', 'CHECK'].includes(pm)) {
      payDto.paymentMethod = this.mapUiPaymentMethod(pm);
      if (pm === 'TRANSFER') {
        payDto.bankAccountKey =
          opts.line.companyBankAccountKey != null
            ? String(opts.line.companyBankAccountKey).trim()
            : undefined;
      }
      if (pm === 'CHECK' && opts.line.companyBankAccountKey != null) {
        // Cartola al compensar el cheque, no al emitir.
        payDto.metadata = {
          ...(payDto.metadata ?? {}),
          checkBankAccountKey: String(opts.line.companyBankAccountKey).trim(),
        };
      }
      if (pm === 'CASH' && opts.line.cashHubId != null) {
        payDto.cashHubId = String(opts.line.cashHubId).trim();
      }
    }

    payDto.notes = opts.note;
    payDto.metadata = {
      ...(payDto.metadata ?? {}),
      origin: 'EXPENSE_PAYMENT',
      installmentNumber: opts.installmentNumber,
      totalInstallments: opts.totalInstallments,
      operatingExpenseId: opts.host.operationalExpenseId,
      operatingExpenseTransactionId: opts.operatingExpenseTransactionId,
    };

    await this.transactionsService.createTransaction(payDto);
  }

  private mapUiPaymentMethod(pm: string): PaymentMethod {
    switch (pm) {
      case 'CASH':
        return PaymentMethod.CASH;
      case 'TRANSFER':
        return PaymentMethod.TRANSFER;
      case 'CHECK':
        return PaymentMethod.CHECK;
      default:
        return PaymentMethod.TRANSFER;
    }
  }
}
