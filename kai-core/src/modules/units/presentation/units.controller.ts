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
import { UnitsService } from '../application/units.service';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async getUnits(@Query('status') status?: string) {
    return this.unitsService.getAllUnits(status);
  }

  @Get(':id')
  async getUnitById(@Param('id') id: string) {
    const unit = await this.unitsService.getUnitById(id);
    if (!unit) {
      return { success: false, message: 'Unit not found', statusCode: 404 };
    }
    return unit;
  }

  @Post()
  async createUnit(
    @Body()
    data: {
      name: string;
      symbol: string;
      dimension: string;
      conversionFactor: number;
      allowDecimals?: boolean;
      isBase?: boolean;
      baseUnitId?: string | null;
      isDefault?: boolean;
    },
  ) {
    return this.unitsService.createUnit(data);
  }

  @Put(':id')
  async updateUnit(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      symbol: string;
      dimension: string;
      conversionFactor: number;
      allowDecimals: boolean;
      active: boolean;
      isBase: boolean;
      baseUnitId: string | null;
      isDefault: boolean;
    }>,
  ) {
    return this.unitsService.updateUnit(id, data);
  }

  @Delete(':id')
  async deleteUnit(@Param('id') id: string) {
    return this.unitsService.deleteUnit(id);
  }
}
