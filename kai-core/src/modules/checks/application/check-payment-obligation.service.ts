import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { ParentPaymentAggregateService } from '@modules/transactions/application/services/parent-payment-aggregate.service';
import { Check, CheckDirection, CheckStatus } from '../domain/check.entity';

const REOPENABLE_PAYMENT_TYPES = new Set<TransactionType>([
  TransactionType.SUPPLIER_PAYMENT,
  TransactionType.PAYROLL_PAYMENT,
  TransactionType.EXPENSE_PAYMENT,
]);

@Injectable()
export class CheckPaymentObligationService {
  private readonly logger = new Logger(CheckPaymentObligationService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly parentPaymentAggregate: ParentPaymentAggregateService,
  ) {}

  /**
   * Protesto o anulación de cheque emitido: el documento de pago vuelve a CxP.
   */
  async reopenLinkedPayment(
    check: Check,
    newStatus: CheckStatus.BOUNCED | CheckStatus.VOIDED,
  ): Promise<void> {
    if (check.direction !== CheckDirection.OUTGOING || !check.transactionId) {
      return;
    }

    const payment = await this.txRepo.findOne({
      where: { id: check.transactionId },
    });
    if (!payment || !REOPENABLE_PAYMENT_TYPES.has(payment.transactionType)) {
      return;
    }

    const reason =
      newStatus === CheckStatus.BOUNCED
        ? check.bouncedReason ?? 'Cheque protestado'
        : 'Cheque anulado';

    const metadata = {
      ...(payment.metadata ?? {}),
      checkReopenedAt: new Date().toISOString(),
      checkReopenReason: reason,
      checkReopenStatus: newStatus,
      checkId: check.id,
      checkNumber: check.checkNumber,
    };

    await this.txRepo.update(payment.id, {
      status: TransactionStatus.DRAFT,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid: 0,
      metadata: metadata as any,
    });

    const executions = await this.txRepo.find({
      where: {
        relatedTransactionId: payment.id,
        transactionType: TransactionType.PAYMENT_EXECUTION,
      },
    });
    for (const ex of executions) {
      if (ex.status === TransactionStatus.VOIDED) continue;
      await this.txRepo.update(ex.id, {
        status: TransactionStatus.VOIDED,
        metadata: {
          ...(ex.metadata ?? {}),
          voidedByCheckReopen: true,
          checkId: check.id,
        } as any,
      });
    }

    if (payment.relatedTransactionId) {
      try {
        await this.parentPaymentAggregate.recalculateParentPaymentStatus(
          payment.relatedTransactionId,
        );
      } catch (err) {
        this.logger.warn(
          `Could not recalculate parent after check reopen: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `Reopened payment ${payment.id} after check ${check.id} → ${newStatus}`,
    );
  }
}
