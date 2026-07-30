import { Controller, Get } from '@nestjs/common';
import { TreasuryAccountsService } from '../application/treasury-accounts.service';

@Controller('treasury-accounts')
export class TreasuryAccountsController {
  constructor(
    private readonly treasuryAccountsService: TreasuryAccountsService,
  ) {}

  @Get()
  async findAll() {
    return this.treasuryAccountsService.findAll();
  }
}
