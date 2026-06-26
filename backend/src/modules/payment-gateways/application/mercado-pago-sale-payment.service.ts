import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentGatewayIntentService } from './payment-gateway-intent.service';

export type SalePaymentGatewayInput = {
  amount: number;
  paymentGatewayIntentId?: string | null;
  reference?: string | null;
};

@Injectable()
export class MercadoPagoSalePaymentService {
  constructor(private readonly intentService: PaymentGatewayIntentService) {}

  async validateAndConsumePointPayments(input: {
    companyId: string;
    transactionId: string;
    payments: SalePaymentGatewayInput[];
  }): Promise<void> {
    for (const payment of input.payments) {
      const intentId = payment.paymentGatewayIntentId?.trim();
      if (!intentId) continue;
      const intent = await this.intentService.assertApprovedForSale({
        companyId: input.companyId,
        intentId,
        amount: payment.amount,
      });
      if (intent.channel !== 'POS_POINT') {
        throw new BadRequestException('Intent de pago no válido para POS');
      }
      await this.intentService.markConsumed(intent, input.transactionId);
    }
  }
}
