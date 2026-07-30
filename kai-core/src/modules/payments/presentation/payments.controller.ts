import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from '../application/payments.service';
import { CreateMultiplePaymentsDto } from '../application/dto/create-multiple-payments.dto';
import { PayQuotaDto } from '../application/dto/pay-quota.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('multiple')
  async createMultiplePayments(@Body() dto: CreateMultiplePaymentsDto) {
    return this.paymentsService.createMultiplePayments(dto);
  }

  @Post('pay-quota')
  async payQuota(@Body() dto: PayQuotaDto) {
    return this.paymentsService.payQuota(dto);
  }
}
