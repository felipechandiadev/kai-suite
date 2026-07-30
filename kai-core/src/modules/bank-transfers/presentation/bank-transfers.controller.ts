import { Body, Controller, Get, Post } from '@nestjs/common';
import { BankTransfersService } from '../application/bank-transfers.service';
import { CreateBankTransferRequestDto } from '../application/dto/create-bank-transfer-request.dto';

@Controller('bank-transfers')
export class BankTransfersController {
  constructor(private readonly bankTransfersService: BankTransfersService) {}

  @Get()
  async list() {
    return this.bankTransfersService.list();
  }

  @Post()
  async create(@Body() payload: CreateBankTransferRequestDto) {
    return this.bankTransfersService.create(payload);
  }
}
