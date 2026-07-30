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
import { ProductsService } from '../application/products.service';
import { ProductsPosService } from '../application/products-pos.service';
import { ProductsServiceAdapter } from '../application/products.service.adapter';
import { SearchProductsDto } from '../application/dto/search-products.dto';
import { SearchPosProductsDto } from '../application/dto/search-pos-products.dto';
import { LookupPosVariantsDto } from '../application/dto/lookup-pos-variants.dto';
import { CreateProductDto } from '../application/dto/create-product.dto';
import { UpdateProductDto } from '../application/dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    // Prefer adapter (CQRS) as primary service
    private readonly productsService: ProductsServiceAdapter,
    private readonly productsPosService: ProductsPosService,
  ) {}

  @Get()
  async findAll(@Query() query: SearchProductsDto) {
    return this.productsService.search({
      query: query.query || '',
      page: query.page || 1,
      pageSize: query.pageSize || 10,
      priceListId: query.priceListId,
      productType: query.productType,
    });
  }

  @Get('search')
  async search(@Query() searchDto: SearchProductsDto) {
    return this.productsService.search(searchDto);
  }

  /**
   * Endpoint optimizado para búsqueda en POS
   * Requiere priceListId y opcionalmente branchId para stock
   */
  @Get('pos/search')
  async searchForPos(@Query() searchDto: SearchPosProductsDto) {
    const data = await this.productsPosService.searchForPos(searchDto);
    return {
      success: true,
      ...data,
    };
  }

  /**
   * Stock, atributos e imagen actuales para un conjunto de variantes (p. ej. al cargar cotización).
   */
  @Get('pos/variants/lookup')
  async lookupPosVariants(@Query() dto: LookupPosVariantsDto) {
    const variantIds = dto.variantIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const products = await this.productsPosService.lookupVariantsForPos({
      variantIds,
      pointOfSaleId: dto.pointOfSaleId,
      branchId: dto.branchId,
      priceListId: dto.priceListId,
    });
    return { success: true, products };
  }

  /**
   * Stock de una variante en la sala de venta del POS o en un almacén explícito.
   * Query: `pointOfSaleId` y/o `storageId` (al menos uno debe resolver un almacén).
   */
  @Get('pos/variants/:variantId/stock-by-storage')
  async getPosVariantStock(
    @Param('variantId') variantId: string,
    @Query('pointOfSaleId') pointOfSaleId?: string,
    @Query('storageId') storageId?: string,
  ) {
    const data = await this.productsPosService.getVariantStockForPos({
      variantId,
      pointOfSaleId,
      storageId,
    });
    return data;
  }

  /** Stock disponible de la variante en todos los almacenes activos de la empresa. */
  @Get('pos/variants/:variantId/stock-breakdown')
  async getPosVariantStockBreakdown(
    @Param('variantId') variantId: string,
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ) {
    return this.productsPosService.getVariantStockBreakdownForPos({
      variantId,
      pointOfSaleId,
    });
  }

  @Get(':id/stocks')
  async stocks(@Param('id') id: string) {
    return this.productsService.getStocks(id);
  }

  @Post()
  async create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
