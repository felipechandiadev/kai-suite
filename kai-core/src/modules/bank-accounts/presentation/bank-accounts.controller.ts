import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { BankAccountsServiceAdapter } from '../application/bank-accounts.service.adapter';
import { CreateBankAccountDto } from '../application/dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../application/dto/update-bank-account.dto';

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(
    private readonly bankAccountsService: BankAccountsServiceAdapter,
  ) {}

  @Get('cash-balance')
  async getCashBalance() {
    return this.bankAccountsService.getCashBalance();
  }

  @Get()
  async list() {
    return this.bankAccountsService.list();
  }

  @Get(':id')
  async findOne(@Param('id') accountKey: string) {
    return this.bankAccountsService.findOne(accountKey);
  }

  @Post()
  async create(@Body() data: CreateBankAccountDto) {
    return this.bankAccountsService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') accountKey: string,
    @Body() data: UpdateBankAccountDto,
  ) {
    return this.bankAccountsService.update(accountKey, data);
  }

  @Delete(':id')
  async remove(@Param('id') accountKey: string) {
    return this.bankAccountsService.remove(accountKey);
  }
}
