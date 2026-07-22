import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { ProductVariantsService } from '../application/product-variants.service';
import { CreateProductVariantDto } from '../application/dto/create-product-variant.dto';
import { UpdateProductVariantDto } from '../application/dto/update-product-variant.dto';
import { ListProductVariantsDto } from '../application/dto/list-product-variants.dto';
import { SearchPurchasingVariantsDto } from '../application/dto/search-purchasing-variants.dto';
import { VariantPurchaseInsightsQueryDto } from '../application/dto/variant-purchase-insights.dto';
import { VariantSalePriceHistoryQueryDto } from '../application/dto/variant-sale-price-history.dto';
import { UpsertVariantProductionUnitsDto } from '../application/dto/upsert-variant-production-units.dto';
import { UpsertVariantBranchAvailabilityDto } from '../application/dto/upsert-variant-branch-availability.dto';
import { UpsertVariantProductionAttributesDto } from '../application/dto/upsert-variant-production-attributes.dto';
import { VariantProductionAttributesService } from '../application/variant-production-attributes.service';

@Controller('product-variants')
export class ProductVariantsController {
  constructor(
    private readonly variantsService: ProductVariantsService,
    private readonly productionAttributesService: VariantProductionAttributesService,
  ) {}

  @Get()
  async findAll(@Query() query: ListProductVariantsDto) {
    return this.variantsService.findAll(query);
  }

  @Get('purchasing-search')
  async searchPurchasing(@Query() query: SearchPurchasingVariantsDto) {
    return this.variantsService.searchForPurchasing(query);
  }

  @Get('scan/by-code')
  async lookupByCode(
    @Query('value') value: string,
    @Query('by') by: 'barcode' | 'sku',
  ) {
    return this.variantsService.lookupByCode(value, by);
  }

  @Get(':id/purchase-insights')
  async purchaseInsights(
    @Param('id') id: string,
    @Query() query: VariantPurchaseInsightsQueryDto,
  ) {
    return this.variantsService.getPurchaseInsights(id, query.limit);
  }

  @Get(':id/sale-price-history')
  async salePriceHistory(
    @Param('id') id: string,
    @Query() query: VariantSalePriceHistoryQueryDto,
  ) {
    const data = await this.variantsService.getSalePriceHistory(id, {
      priceListId: query.priceListId,
      limit: query.limit,
    });
    return { success: true, data };
  }

  @Get(':id/production-units')
  async listProductionUnits(@Param('id') id: string) {
    const items = await this.variantsService.listProductionUnitRouting(id);
    return { items };
  }

  @Put(':id/production-units')
  async upsertProductionUnits(
    @Param('id') id: string,
    @Body() body: UpsertVariantProductionUnitsDto,
  ) {
    const items = await this.variantsService.upsertProductionUnitRouting(
      id,
      body.items ?? [],
    );
    return { items };
  }

  @Get(':id/branch-availability')
  async listBranchAvailability(@Param('id') id: string) {
    const items = await this.variantsService.listBranchAvailability(id);
    return { items };
  }

  @Put(':id/branch-availability')
  async upsertBranchAvailability(
    @Param('id') id: string,
    @Body() body: UpsertVariantBranchAvailabilityDto,
  ) {
    const items = await this.variantsService.upsertBranchAvailability(
      id,
      body.items ?? [],
    );
    return { items };
  }

  @Get(':id/production-attributes')
  async listProductionAttributes(@Param('id') id: string) {
    const items = await this.productionAttributesService.list(id);
    return { items };
  }

  @Put(':id/production-attributes')
  async upsertProductionAttributes(
    @Param('id') id: string,
    @Body() body: UpsertVariantProductionAttributesDto,
  ) {
    const items = await this.productionAttributesService.replace(
      id,
      body.items ?? [],
    );
    return { items };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.variantsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateProductVariantDto) {
    return this.variantsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateProductVariantDto) {
    return this.variantsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
