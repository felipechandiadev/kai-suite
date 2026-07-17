import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductionUnitsService } from '../application/production-units.service';
import { CreateProductionUnitDto } from '../application/dto/create-production-unit.dto';
import { UpdateProductionUnitDto } from '../application/dto/update-production-unit.dto';

@Controller('production-units')
export class ProductionUnitsController {
  constructor(private readonly productionUnitsService: ProductionUnitsService) {}

  @Get()
  async list(
    @Query('branchId') branchId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const include =
      includeInactive === 'true' || includeInactive === '1';
    return this.productionUnitsService.findAll({
      branchId: branchId?.trim() || undefined,
      includeInactive: include,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const unit = await this.productionUnitsService.findOne(id);
    if (!unit) {
      return {
        success: false,
        message: 'Unidad de producción no encontrada',
        statusCode: 404,
      };
    }
    return unit;
  }

  @Post()
  async create(@Body() dto: CreateProductionUnitDto) {
    return this.productionUnitsService.create({
      branchId: dto.branchId,
      code: dto.code,
      name: dto.name,
      defaultInputStorageId: dto.defaultInputStorageId ?? null,
      isActive: dto.isActive,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductionUnitDto) {
    return this.productionUnitsService.update(id, {
      branchId: dto.branchId,
      code: dto.code,
      name: dto.name,
      defaultInputStorageId: dto.defaultInputStorageId,
      isActive: dto.isActive,
    });
  }
}
