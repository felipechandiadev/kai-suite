import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RecurringOperationalExpensesService } from '../application/recurring-operational-expenses.service';
import { CreateRecurringOperationalExpenseDto } from '../application/dto/create-recurring-operational-expense.dto';
import { UpdateRecurringOperationalExpenseDto } from '../application/dto/update-recurring-operational-expense.dto';
import { ListRecurringOperationalExpensesDto } from '../application/dto/list-recurring-operational-expenses.dto';

@Controller('recurring-operating-expenses')
export class RecurringOperationalExpensesController {
  constructor(private readonly service: RecurringOperationalExpensesService) {}

  @Get()
  async findAll(@Query() query: ListRecurringOperationalExpensesDto) {
    return this.service.findAll({
      companyId: query.companyId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id/runs')
  async listRuns(@Param('id') id: string) {
    return this.service.listRuns(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateRecurringOperationalExpenseDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringOperationalExpenseDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    return this.service.pause(id);
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    return this.service.resume(id);
  }

  @Post(':id/generate')
  async generate(@Param('id') id: string) {
    return this.service.generate(id, { advanceSchedule: true });
  }
}
