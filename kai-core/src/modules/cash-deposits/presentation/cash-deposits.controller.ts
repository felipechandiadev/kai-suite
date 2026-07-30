import { Body, Controller, Get, Post } from '@nestjs/common';
import { CashDepositsService } from '../application/cash-deposits.service';
import { CreateCashDepositRequestDto } from '../application/dto/create-cash-deposit-request.dto';

@Controller('cash-deposits')
export class CashDepositsController {
  constructor(private readonly cashDepositsService: CashDepositsService) {}

  @Get()
  async list() {
    return this.cashDepositsService.list();
  }

  @Post()
  async create(@Body() payload: CreateCashDepositRequestDto) {
    return this.cashDepositsService.create(payload);
  }
}
