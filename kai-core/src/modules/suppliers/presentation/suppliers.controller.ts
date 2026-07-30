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
import { SuppliersServiceAdapter } from '../application/suppliers.service.adapter';
import { CreateSupplierDto } from '../application/dto/create-supplier.dto';
import { UpdateSupplierDto } from '../application/dto/update-supplier.dto';
import { ListSuppliersDto } from '../application/dto/list-suppliers.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersServiceAdapter) {}

  @Get()
  async findAll(@Query() query: ListSuppliersDto) {
    return this.service.findAll({
      limit: query.limit || 50,
      offset: query.offset || 0,
      isActive: query.isActive,
      supplierType: query.supplierType,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }
}
