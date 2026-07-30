import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '../../domain/transaction.entity';
import { ChecksService } from '@modules/checks/application/checks.service';
import { CheckDirection } from '@modules/checks/domain/check.entity';
import { TransactionCreatedEvent } from '../../../../shared/events/transaction-created.event';
import { DocumentNumberService } from '../document-number.service';
import { ParentPaymentAggregateService } from '../services/parent-payment-aggregate.service';
import { PaymentStatus } from '../../domain/transaction.entity';

export class CompletePaymentCommand {
  constructor(
    public readonly paymentId: string,
    public readonly data: {
      paymentMethod?: string;
      bankAccountKey?: string;
      cashHubId?: string;
      supplierBankAccount?: any;
      companyBankAccount?: any;
      note?: string;
      checkData?: {
        checkNumber: string;
        bankName: string;
        bankAccountKey?: string | null;
        drawerName?: string | null;
        dueDate?: string | null;
        payeeName?: string | null;
      };
    },
  ) {}
}

@Injectable()
@CommandHandler(CompletePaymentCommand)
export class CompletePaymentUseCase implements ICommandHandler<CompletePaymentCommand> {
  private logger = new Logger(CompletePaymentUseCase.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly eventBus: EventBus,
    private readonly documentNumberService: DocumentNumberService,
    private readonly parentPaymentAggregate: ParentPaymentAggregateService,
    @Inject(forwardRef(() => ChecksService))
    private readonly checksService: ChecksService,
  ) {}

  async execute(command: CompletePaymentCommand): Promise<Transaction> {
    const { paymentId, data } = command;

    // Cargar payment con relaciones necesarias para crear PAYMENT_EXECUTION
    const payment = await this.transactionsRepository.findOne({
      where: { id: paymentId },
      relations: ['branch', 'branch.company'],
    });

    if (!payment) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }

    const completableTypes: TransactionType[] = [
      TransactionType.SUPPLIER_PAYMENT,
      TransactionType.PAYROLL_PAYMENT,
      TransactionType.EXPENSE_PAYMENT,
    ];
    if (!completableTypes.includes(payment.transactionType)) {
      throw new BadRequestException(
        `Transaction ${paymentId} is not a completable accounts-payable payment`,
      );
    }

    if (payment.status === TransactionStatus.CONFIRMED) {
      throw new ConflictException(`Payment ${paymentId} is already confirmed`);
    }

    const pendingAmount = Number(payment.total) - Number(payment.amountPaid);
    if (pendingAmount <= 0) {
      throw new ConflictException(`Payment ${paymentId} has no pending amount`);
    }

    const paymentMethod =
      (data.paymentMethod as PaymentMethod) || payment.paymentMethod;
    if (paymentMethod === PaymentMethod.CHECK) {
      const cn = String(data.checkData?.checkNumber ?? '').trim();
      const bank = String(data.checkData?.bankName ?? '').trim();
      if (!cn) {
        throw new BadRequestException(
          'Pago con cheque requiere número de cheque',
        );
      }
      if (!bank) {
        throw new BadRequestException(
          'Pago con cheque requiere banco emisor (cuenta empresa)',
        );
      }
    }

    const checkData =
      paymentMethod === PaymentMethod.CHECK && data.checkData
        ? {
            checkNumber: String(data.checkData.checkNumber).trim(),
            bankName: String(data.checkData.bankName).trim(),
            bankAccountKey: data.checkData.bankAccountKey ?? data.bankAccountKey ?? null,
            drawerName: data.checkData.drawerName?.trim() || null,
            dueDate: data.checkData.dueDate?.trim() || null,
            payeeName: data.checkData.payeeName?.trim() || null,
            issueDate: new Date().toISOString().slice(0, 10),
          }
        : null;

    // 1. Actualizar documento de pago (SUPPLIER_PAYMENT / PAYROLL_PAYMENT)
    const updatedMetadata = {
      ...(payment.metadata || {}),
      completedAt: new Date().toISOString(),
      supplierBankAccount: data.supplierBankAccount,
      companyBankAccount: data.companyBankAccount,
      ...(checkData ? { checkData } : {}),
    };

    await this.transactionsRepository.update(paymentId, {
      amountPaid: payment.total,
      status: TransactionStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod,
      // Cheque: el banco (cartola) se aplica al compensar, no al emitir.
      bankAccountKey:
        paymentMethod === PaymentMethod.CHECK
          ? (null as unknown as undefined)
          : data.bankAccountKey || payment.bankAccountKey,
      cashHubId: data.cashHubId || payment.cashHubId,
      notes: data.note
        ? `${payment.notes || ''}\n${data.note}`.trim()
        : payment.notes,
      metadata: updatedMetadata as any,
    });

    this.logger.log(
      `Payment ${paymentId} marked as CONFIRMED. Amount: ${payment.total}`,
    );

    if (paymentMethod === PaymentMethod.CHECK && checkData) {
      const companyId = payment.branch?.company?.id;
      if (companyId) {
        try {
          await this.checksService.createFromTransactionPayment({
            companyId,
            transactionId: paymentId,
            direction: CheckDirection.OUTGOING,
            checkNumber: checkData.checkNumber,
            bankName: checkData.bankName,
            bankAccountKey: checkData.bankAccountKey,
            drawerName: checkData.drawerName,
            payeeName: checkData.payeeName,
            payeeId: payment.supplierId ?? payment.employeeId ?? null,
            amount: Number(payment.total ?? 0),
            currency: 'CLP',
            issueDate: checkData.issueDate,
            dueDate: checkData.dueDate,
            metadata: { source: 'accounts_payable_complete' },
          });
        } catch (err) {
          this.logger.warn(
            `Could not materialize check for payment ${paymentId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }

    // 2. Crear transacción PAYMENT_EXECUTION
    if (!payment.branchId) {
      throw new BadRequestException(`Payment ${paymentId} has no branchId`);
    }
    const companyId = payment.branch?.companyId;
    if (!companyId) {
      throw new BadRequestException(
        `Payment ${paymentId} branch has no companyId`,
      );
    }

    const executionDocNumber = await this.documentNumberService.allocateNext(
      payment.branchId,
      TransactionType.PAYMENT_EXECUTION,
      companyId,
    );

    const paymentExecution = this.transactionsRepository.create({
      documentNumber: executionDocNumber,
      transactionType: TransactionType.PAYMENT_EXECUTION,
      status: TransactionStatus.CONFIRMED,
      branchId: payment.branchId,
      userId: payment.userId,
      relatedTransactionId: paymentId,
      supplierId: payment.supplierId,
      employeeId: payment.employeeId,
      expenseCategoryId: payment.expenseCategoryId,
      total: payment.total,
      subtotal: payment.subtotal,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: paymentMethod,
      amountPaid: payment.total, // Ya está pagado
      bankAccountKey:
        paymentMethod === PaymentMethod.CHECK
          ? undefined
          : data.bankAccountKey || payment.bankAccountKey,
      cashHubId: data.cashHubId || payment.cashHubId,
      accountingPeriodId: payment.accountingPeriodId,
      notes: data.note
        ? `Pago ejecutado: ${data.note}`
        : `Pago ejecutado de ${payment.documentNumber}`,
      metadata: {
        origin: 'PAYMENT_COMPLETION',
        sourcePaymentId: paymentId,
        sourcePaymentDocNumber: payment.documentNumber,
        paymentOutId: paymentId,
        paymentOutDocNumber: payment.documentNumber,
        supplierBankAccount: data.supplierBankAccount,
        companyBankAccount: data.companyBankAccount,
        completedAt: new Date().toISOString(),
        // Copiar metadata crítico desde el pago origen para contabilidad
        payrollLineType: payment.metadata?.payrollLineType,
        payrollTransactionId: payment.metadata?.payrollTransactionId,
        expenseCategoryId: payment.expenseCategoryId,
        operatingExpenseId: payment.metadata?.operatingExpenseId,
      },
    });

    const savedExecution =
      await this.transactionsRepository.save(paymentExecution);

    this.logger.log(
      `Created PAYMENT_EXECUTION ${savedExecution.id} for payment ${paymentId}. Doc: ${executionDocNumber}`,
    );

    // 3. Emitir evento para generar asientos contables
    if (payment.branch?.company?.id) {
      // Get companyId from branch
      const branch = await this.transactionsRepository.manager
        .getRepository('Branch')
        .findOne({ where: { id: savedExecution.branchId } });
      const companyId = branch?.companyId;

      this.eventBus.publish(
        new TransactionCreatedEvent(savedExecution, companyId),
      );

      this.logger.log(
        `Emitted 'transaction.created' event for PAYMENT_EXECUTION ${savedExecution.id}. ` +
          `AccountingEngineListener will generate ledger entries automatically.`,
      );
    } else {
      this.logger.warn(
        `Could not emit 'transaction.created' event for PAYMENT_EXECUTION ${savedExecution.id}: ` +
          `branch.company not loaded. Ledger entries will NOT be generated.`,
      );
    }

    if (payment.relatedTransactionId) {
      try {
        await this.parentPaymentAggregate.recalculateParentPaymentStatus(
          payment.relatedTransactionId,
        );
      } catch (err) {
        this.logger.warn(
          `Could not recalculate parent payment status for ${payment.relatedTransactionId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return this.findOne(paymentId);
  }

  private async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: [
        'branch',
        'pointOfSale',
        'cashSession',
        'customer',
        'customer.person',
        'supplier',
        'supplier.person',
        'expenseCategory',
        'resultCenter',
        'shareholder',
        'employee',
        'user',
        'user.person',
        'storageEntry',
        'targetStorageEntry',
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
      ],
    });

    if (!transaction) {
      throw new BadRequestException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

}
