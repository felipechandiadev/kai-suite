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
import { ExpenseCategoriesService } from '../application/expense-categories.service';
import { CreateExpenseCategoryDto } from '../application/dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../application/dto/update-expense-category.dto';
import { ListExpenseCategoriesDto } from '../application/dto/list-expense-categories.dto';
import { OPERATIONAL_EXPENSE_GROUP_META } from '../domain/expense-category-operational-group.enum';
import { EXPENSE_CATEGORY_PNL_NATURE_META } from '../domain/expense-category-pnl-nature.enum';

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly service: ExpenseCategoriesService) {}

  /** Catálogo cerrado de grupos operativos (valor + etiqueta + descripción) para formularios admin. */
  @Get('meta/operational-groups')
  getOperationalGroupsMeta() {
    return OPERATIONAL_EXPENSE_GROUP_META;
  }

  /** Catálogo cerrado de naturaleza P&L (ventas vs administración). */
  @Get('meta/pnl-natures')
  getPnlNaturesMeta() {
    return EXPENSE_CATEGORY_PNL_NATURE_META;
  }

  @Get()
  async findAll(@Query() query: ListExpenseCategoriesDto) {
    return this.service.findAll({
      limit: query.limit || 50,
      offset: query.offset || 0,
      companyId: query.companyId,
      isActive: query.isActive,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateExpenseCategoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }
}
