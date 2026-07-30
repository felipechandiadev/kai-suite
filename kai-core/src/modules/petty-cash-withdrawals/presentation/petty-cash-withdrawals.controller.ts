import { Body, Controller, Post } from '@nestjs/common';
import { PettyCashWithdrawalsService } from '../application/petty-cash-withdrawals.service';
import { CreatePettyCashWithdrawalRequestDto } from '../application/dto/create-petty-cash-withdrawal-request.dto';

@Controller('petty-cash-withdrawals')
export class PettyCashWithdrawalsController {
  constructor(private readonly pettyCashWithdrawalsService: PettyCashWithdrawalsService) {}

  @Post()
  async create(@Body() payload: CreatePettyCashWithdrawalRequestDto) {
    return this.pettyCashWithdrawalsService.create(payload);
  }
}
