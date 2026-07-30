import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { MetalPricesService } from '../application/metal-prices.service';
import { CreateMetalPriceDto } from '../application/dto/create-metal-price.dto';
import { UpdateMetalPriceDto } from '../application/dto/update-metal-price.dto';

@Controller('metal-prices')
export class MetalPricesController {
  constructor(private readonly metalPricesService: MetalPricesService) {}

  @Get()
  async findAll(@CurrentCompany() companyId: string) {
    return this.metalPricesService.findAll(companyId);
  }

  @Get(':id')
  async findOne(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.metalPricesService.findOne(id, companyId);
  }

  @Post()
  async create(
    @CurrentCompany() companyId: string,
    @Body() createDto: CreateMetalPriceDto,
  ) {
    return this.metalPricesService.create(companyId, createDto);
  }

  @Put(':id')
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateMetalPriceDto,
  ) {
    return this.metalPricesService.update(id, companyId, updateDto);
  }

  @Delete(':id')
  async remove(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.metalPricesService.remove(id, companyId);
  }
}
