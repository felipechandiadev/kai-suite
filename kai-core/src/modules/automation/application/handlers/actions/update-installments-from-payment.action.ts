import { Injectable, Logger } from '@nestjs/common';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentRepository } from '@modules/installments/infrastructure/installment.repository';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';

@Injectable()
export class UpdateInstallmentsFromPaymentActionHandler {
  private readonly logger = new Logger(UpdateInstallmentsFromPaymentActionHandler.name);

  constructor(
    private readonly installmentService: InstallmentService,
    private readonly installmentRepo: InstallmentRepository,
  ) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any) {
    const transaction = ctx.payload?.transaction as Transaction;
    if (!transaction?.id) return;

    const type = transaction.transactionType;
    if (
      ![
        TransactionType.PAYMENT_IN,
        TransactionType.SUPPLIER_PAYMENT,
        TransactionType.EXPENSE_PAYMENT,
        TransactionType.PAYMENT_EXECUTION,
      ].includes(type)
    ) {
      return;
    }

    try {
      const paidQuotaId = (transaction.metadata as any)?.paidQuotaId;
      if (paidQuotaId) {
        await this.installmentService.updateInstallmentFromPayment(
          paidQuotaId,
          parseFloat(transaction.total.toString()),
          transaction.id,
        );
        return;
      }
      if (!transaction.relatedTransactionId) {
        return;
      }
      const installments = await this.installmentRepo.getInstallmentsByTransaction(
        transaction.relatedTransactionId,
      );
      if (installments.length === 0) return;
      const target = installments.find(
        (i) => i.status === 'PENDING' || i.status === 'PARTIAL',
      );
      if (!target) return;
      await this.installmentService.updateInstallmentFromPayment(
        target.id,
        parseFloat(transaction.total.toString()),
        transaction.id,
      );
    } catch (e) {
      this.logger.error(
        `Error updating installments from payment tx=${transaction.id} ruleId=${rule?.id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}

