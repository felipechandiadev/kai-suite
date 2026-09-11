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
import { CurrentCompany } from '@common/tenant';
import { ProductAddonsService } from '../application/product-addons.service';

class AddProductAddonDto {
  addonProductId!: string;
  sortOrder?: number;
}

class ReorderProductAddonsDto {
  orderedAddonProductIds!: string[];
}

@Controller('products')
export class ProductAddonsController {
  constructor(private readonly productAddonsService: ProductAddonsService) {}

  @Get(':productId/addons')
  async list(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
  ) {
    return this.productAddonsService.listByHostProduct(
      companyId,
      productId.trim(),
    );
  }

  @Post(':productId/addons')
  async add(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
    @Body() dto: AddProductAddonDto,
  ) {
    return this.productAddonsService.addAddon(
      companyId,
      productId.trim(),
      dto.addonProductId.trim(),
      dto.sortOrder,
    );
  }

  @Delete(':productId/addons/:addonProductId')
  async remove(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
    @Param('addonProductId') addonProductId: string,
  ) {
    await this.productAddonsService.removeAddon(
      companyId,
      productId.trim(),
      addonProductId.trim(),
    );
    return { success: true };
  }

  @Put(':productId/addons/reorder')
  async reorder(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
    @Body() dto: ReorderProductAddonsDto,
  ) {
    return this.productAddonsService.reorderAddons(
      companyId,
      productId.trim(),
      dto.orderedAddonProductIds ?? [],
    );
  }

  @Get('agregado/search')
  async searchAgregados(
    @CurrentCompany() companyId: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productAddonsService.searchAgregadoProducts(companyId, {
      categoryId,
      query,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
