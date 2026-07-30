import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PriceListItemsServiceAdapter } from '../application/price-list-items.service.adapter';

@Controller('price-list-items')
export class PriceListItemsController {
  constructor(
    private readonly priceListItemsService: PriceListItemsServiceAdapter,
  ) {}

  @Get()
  async getAllItems() {
    try {
      const items = await this.priceListItemsService.getAllItems();

      return {
        success: true,
        data: items,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getItemById(@Param('id') id: string) {
    try {
      const item = await this.priceListItemsService.getItemById(id);

      if (!item) {
        throw new HttpException(
          {
            success: false,
            message: 'Price list item not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
