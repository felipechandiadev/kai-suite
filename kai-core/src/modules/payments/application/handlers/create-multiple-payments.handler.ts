import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CreateMultiplePaymentsCommand } from '../commands/create-multiple-payments.command';
import { Inject } from '@nestjs/common';
import {
  PAYMENTS_REPOSITORY,
  PaymentsRepositoryPort,
} from '../ports/payments.repository.port';

@CommandHandler(CreateMultiplePaymentsCommand)
export class CreateMultiplePaymentsHandler implements ICommandHandler<CreateMultiplePaymentsCommand> {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepo: PaymentsRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateMultiplePaymentsCommand) {
    // Basic orchestration: persist each payment via repository
    const created: any[] = [];
    for (const p of command.payments) {
      const saved = await this.paymentsRepo.createPayment({
        saleTransactionId: command.saleTransactionId,
        ...p,
        createdBy: command.userId,
      });
      created.push(saved);
      // Optionally publish events
      // this.eventBus.publish(new PaymentCreatedEvent(saved.id, saved));
    }

    return { success: true, payments: created };
  }
}
