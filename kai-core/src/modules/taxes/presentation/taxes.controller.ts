import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TaxesService } from '../application/taxes.service';

@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  async getTaxes(
    @Query('includeInactive') includeInactive?: string,
    @Query('isActive') isActive?: string,
  ) {
    const include = includeInactive === 'true' || includeInactive === '1';
    const isActiveBool =
      isActive === 'true' || isActive === '1'
        ? true
        : isActive === 'false' || isActive === '0'
          ? false
          : undefined;
    return this.taxesService.getAllTaxes(include, isActiveBool);
  }

  @Get(':id')
  async getTaxById(@Param('id') id: string) {
    const tax = await this.taxesService.getTaxById(id);
    if (!tax) {
      return { success: false, message: 'Tax not found', statusCode: 404 };
    }
    return tax;
  }

  @Post()
  async createTax(
    @Body()
    data: {
      companyId: string;
      name: string;
      code?: string | null;
      taxType?: string;
      rate: number;
      description?: string | null;
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.taxesService.createTax(data);
  }

  @Put(':id')
  async updateTax(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      code: string | null;
      taxType: string;
      rate: number;
      description: string | null;
      isDefault: boolean;
      isActive: boolean;
    }>,
  ) {
    return this.taxesService.updateTax(id, data);
  }

  @Delete(':id')
  async deleteTax(@Param('id') id: string) {
    return this.taxesService.deleteTax(id);
  }
}
