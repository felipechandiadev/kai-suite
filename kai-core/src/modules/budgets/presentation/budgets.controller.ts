import { Controller, Get, Param, Query } from '@nestjs/common';
import { BudgetsServiceAdapter } from '../application/budgets.service.adapter';
import { ListBudgetsDto } from '../application/dto/list-budgets.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsServiceAdapter) {}

  @Get()
  async findAll(@Query() query: ListBudgetsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
