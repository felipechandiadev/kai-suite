import { Injectable, Logger } from '@nestjs/common';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';

@Injectable()
export class CreateInstallmentsActionHandler {
  private readonly logger = new Logger(CreateInstallmentsActionHandler.name);

  constructor(private readonly installmentService: InstallmentService) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any) {
    const transaction = ctx.payload?.transaction as Transaction;
    if (!transaction?.id) return;

    try {
      if (
        ![TransactionType.SALE, TransactionType.PURCHASE].includes(
          transaction.transactionType,
        )
      ) {
        return;
      }

      await this.installmentService.createFromTransactionMetadata(
        transaction,
        ctx.companyId,
      );
    } catch (e) {
      this.logger.error(
        `Error creating installments tx=${transaction.id} ruleId=${rule?.id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}
