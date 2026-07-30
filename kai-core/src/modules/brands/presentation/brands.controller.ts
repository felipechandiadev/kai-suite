import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { BrandsService } from '../application/brands.service';
import { CreateBrandDto } from '../application/dto/create-brand.dto';
import { UpdateBrandDto } from '../application/dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async list(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.brandsService.findAll(include);
  }

  @Get('with-counts')
  async listWithCounts(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.brandsService.findAllWithProductCounts(include);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const brand = await this.brandsService.findOne(id);
    if (!brand) {
      return { success: false, message: 'Marca no encontrada', statusCode: 404 };
    }
    return brand;
  }

  @Post()
  async create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create({
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.brandsService.remove(id);
    return { success: true };
  }
}
