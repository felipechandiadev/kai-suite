import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PayQuotaCommand } from '../commands/pay-quota.command';
import { Inject } from '@nestjs/common';
import {
  PAYMENTS_REPOSITORY,
  PaymentsRepositoryPort,
} from '../ports/payments.repository.port';

@CommandHandler(PayQuotaCommand)
export class PayQuotaHandler implements ICommandHandler<PayQuotaCommand> {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepo: PaymentsRepositoryPort,
  ) {}

  async execute(command: PayQuotaCommand) {
    // simple flow: fetch payment, apply amount, save
    const payment = await this.paymentsRepo.getPaymentById(command.paymentId);
    if (!payment) throw new Error('Payment not found');

    // apply payment
    payment.paidAmount = (payment.paidAmount || 0) + command.amount;
    payment.lastPaidAt = new Date();
    payment.lastPaidBy = command.userId;

    const saved = await this.paymentsRepo.createPayment(payment);
    return { success: true, payment: saved };
  }
}
