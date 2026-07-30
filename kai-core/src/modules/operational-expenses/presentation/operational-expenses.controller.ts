import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { OperationalExpensesService } from '../application/operational-expenses.service';
import { CreateOperationalExpenseDto } from '../application/dto/create-operational-expense.dto';
import { UpdateOperationalExpenseDto } from '../application/dto/update-operational-expense.dto';
import { ListOperationalExpensesDto } from '../application/dto/list-operational-expenses.dto';

@Controller('operating-expenses')
export class OperationalExpensesController {
  constructor(private readonly service: OperationalExpensesService) {}

  @Get()
  async findAll(@Query() query: ListOperationalExpensesDto) {
    return this.service.findAll({
      limit: query.limit || 50,
      offset: query.offset || 0,
      companyId: query.companyId,
      branchId: query.branchId,
      status: query.status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateOperationalExpenseDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOperationalExpenseDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }
}
