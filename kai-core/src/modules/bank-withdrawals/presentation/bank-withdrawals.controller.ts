import { Body, Controller, Get, Post } from '@nestjs/common';
import { BankWithdrawalsService } from '../application/bank-withdrawals.service';
import { CreateBankWithdrawalRequestDto } from '../application/dto/create-bank-withdrawal-request.dto';

@Controller('bank-withdrawals')
export class BankWithdrawalsController {
  constructor(
    private readonly bankWithdrawalsService: BankWithdrawalsService,
  ) {}

  @Get()
  async list() {
    return this.bankWithdrawalsService.list();
  }

  @Post()
  async create(@Body() payload: CreateBankWithdrawalRequestDto) {
    return this.bankWithdrawalsService.create(payload);
  }
}
