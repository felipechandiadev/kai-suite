import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateMultiplePaymentsCommand } from './commands/create-multiple-payments.command';
import { PayQuotaCommand } from './commands/pay-quota.command';
import { CreateMultiplePaymentsDto, PayQuotaDto } from './dto/payments.dto';

@Injectable()
export class PaymentsServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createMultiplePayments(
    dto: { saleTransactionId: string; payments: any[] },
    userId: string,
  ) {
    // basic validation
    const payload = dto as CreateMultiplePaymentsDto;
    if (!payload.saleTransactionId)
      throw new Error('saleTransactionId required');
    if (!Array.isArray(payload.payments) || payload.payments.length === 0)
      throw new Error('payments required');

    const cmd = new CreateMultiplePaymentsCommand(
      payload.saleTransactionId,
      payload.payments,
      userId,
    );
    return this.commandBus.execute(cmd);
  }

  async payQuota(payload: any, userId: string) {
    const dto = payload as PayQuotaDto;
    if (!dto.paymentId) throw new Error('paymentId required');
    if (!dto.amount || dto.amount <= 0) throw new Error('amount must be > 0');

    const cmd = new PayQuotaCommand(
      dto.paymentId,
      dto.amount,
      userId,
      dto.method,
    );
    return this.commandBus.execute(cmd);
  }
}
