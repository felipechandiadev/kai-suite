import { Controller, Get, Param, Query } from '@nestjs/common';
import { AccountingPeriodSnapshotsServiceAdapter } from '../application/accounting-period-snapshots.service.adapter';
import { ListAccountingPeriodSnapshotsDto } from '../application/dto/list-accounting-period-snapshots.dto';

@Controller('accounting-period-snapshots')
export class AccountingPeriodSnapshotsController {
  constructor(
    private readonly service: AccountingPeriodSnapshotsServiceAdapter,
  ) {}

  @Get()
  async findAll(@Query() query: ListAccountingPeriodSnapshotsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
