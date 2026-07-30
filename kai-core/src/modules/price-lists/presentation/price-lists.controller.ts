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
import { PriceListsService } from '../application/price-lists.service';

@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  async getPriceLists(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.priceListsService.getAllPriceLists(include);
  }

  @Get(':id')
  async getPriceListById(@Param('id') id: string) {
    const priceList = await this.priceListsService.getPriceListById(id);
    if (!priceList) {
      return {
        success: false,
        message: 'Price list not found',
        statusCode: 404,
      };
    }
    return priceList;
  }

  @Post()
  async createPriceList(
    @Body()
    data: {
      name: string;
      priceListType: string;
      currency?: string;
      validFrom?: Date | string;
      validUntil?: Date | string;
      priority?: number;
      isDefault?: boolean;
      isActive?: boolean;
      description?: string | null;
    },
  ) {
    return this.priceListsService.createPriceList(data);
  }

  @Put(':id')
  async updatePriceList(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      priceListType: string;
      currency: string;
      validFrom?: Date | string | null;
      validUntil?: Date | string | null;
      priority: number;
      isDefault: boolean;
      isActive: boolean;
      description: string | null;
    }>,
  ) {
    return this.priceListsService.updatePriceList(id, data);
  }

  @Delete(':id')
  async deletePriceList(@Param('id') id: string) {
    return this.priceListsService.deletePriceList(id);
  }
}
