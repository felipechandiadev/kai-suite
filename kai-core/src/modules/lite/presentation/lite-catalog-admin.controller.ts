import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenant } from '@common/tenant';
import { LiteCatalogAdminService } from '../application/lite-catalog-admin.service';
import { LiteCompanyResolver } from '../application/lite-company.resolver';
import {
  LiteBulkCreateProductsDto,
  LiteCreateProductDto,
  LiteCreateVariantDto,
  LitePatchProductDto,
  LitePatchVariantDto,
} from '../application/dto/lite-product-admin.dto';
import { LiteUpsertPackDto } from '../application/dto/lite-pack.dto';
import { LiteCreateUnitDto, LitePatchUnitDto } from '../application/dto/lite-unit.dto';
import {
  LiteCreateStorageDto,
  LitePatchStorageDto,
} from '../application/dto/lite-storage.dto';
import {
  LiteCreateAttributeDto,
  LiteCreateCategoryDto,
  LitePatchAttributeDto,
  LitePatchCategoryDto,
} from '../application/dto/lite-taxonomy.dto';

@ApiTags('Lite')
@ApiBearerAuth('JWT-auth')
@SkipTenant()
@Controller('lite')
export class LiteCatalogAdminController {
  constructor(
    private readonly catalog: LiteCatalogAdminService,
    private readonly companies: LiteCompanyResolver,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Lite products list (admin)' })
  async products(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.listProducts(companyId);
  }

  @Post('products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite create product + default variant' })
  async createProduct(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteCreateProductDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.createProduct(companyId, dto);
  }

  @Post('products/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite bulk create products from CSV rows' })
  async bulkCreateProducts(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteBulkCreateProductsDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.bulkCreateProducts(companyId, dto);
  }

  @Patch('products/:productId')
  @ApiOperation({ summary: 'Lite patch product' })
  async patchProduct(
    @Headers('authorization') auth: string | undefined,
    @Param('productId') productId: string,
    @Body() dto: LitePatchProductDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.patchProduct(companyId, productId, dto);
  }

  @Get('products/:productId/variants')
  @ApiOperation({ summary: 'Lite list sibling variants of a product' })
  async listProductVariants(
    @Headers('authorization') auth: string | undefined,
    @Param('productId') productId: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.listProductVariants(companyId, productId);
  }

  @Post('products/:productId/variants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite create sibling variant' })
  async createVariant(
    @Headers('authorization') auth: string | undefined,
    @Param('productId') productId: string,
    @Body() dto: LiteCreateVariantDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.createVariant(companyId, productId, dto);
  }

  @Get('variants/:variantId')
  @ApiOperation({ summary: 'Lite variant detail' })
  async getVariant(
    @Headers('authorization') auth: string | undefined,
    @Param('variantId') variantId: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.getVariant(companyId, variantId);
  }

  @Patch('variants/:variantId')
  @ApiOperation({ summary: 'Lite patch variant' })
  async patchVariant(
    @Headers('authorization') auth: string | undefined,
    @Param('variantId') variantId: string,
    @Body() dto: LitePatchVariantDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.patchVariant(companyId, variantId, dto);
  }

  @Get('variants/:variantId/pack')
  @ApiOperation({ summary: 'Lite pack composition' })
  async getPack(
    @Headers('authorization') auth: string | undefined,
    @Param('variantId') variantId: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.getPack(companyId, variantId);
  }

  @Put('variants/:variantId/pack')
  @ApiOperation({ summary: 'Lite upsert pack composition' })
  async putPack(
    @Headers('authorization') auth: string | undefined,
    @Param('variantId') variantId: string,
    @Body() dto: LiteUpsertPackDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.upsertPack(companyId, variantId, dto);
  }

  @Get('units')
  @ApiOperation({ summary: 'Lite units' })
  async units(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.listUnits(companyId);
  }

  @Post('units')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite create unit' })
  async createUnit(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteCreateUnitDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.createUnit(companyId, dto);
  }

  @Patch('units/:id')
  @ApiOperation({ summary: 'Lite patch unit' })
  async patchUnit(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Body() dto: LitePatchUnitDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.patchUnit(companyId, id, dto);
  }

  @Get('storages')
  @ApiOperation({ summary: 'Lite storages' })
  async storages(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.listStorages(companyId);
  }

  @Post('storages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite create storage' })
  async createStorage(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteCreateStorageDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.createStorage(companyId, dto);
  }

  @Patch('storages/:id')
  @ApiOperation({ summary: 'Lite patch storage' })
  async patchStorage(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Body() dto: LitePatchStorageDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.patchStorage(companyId, id, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lite categories' })
  async categories(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.listCategories(companyId);
  }

  @Post('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite create category' })
  async createCategory(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteCreateCategoryDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.createCategory(companyId, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Lite patch category' })
  async patchCategory(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Body() dto: LitePatchCategoryDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.patchCategory(companyId, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Lite delete category' })
  async deleteCategory(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.deleteCategory(companyId, id);
  }

  @Get('attributes')
  @ApiOperation({ summary: 'Lite attributes' })
  async attributes(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.listAttributes(companyId);
  }

  @Post('attributes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite create attribute' })
  async createAttribute(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteCreateAttributeDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.createAttribute(companyId, dto);
  }

  @Patch('attributes/:id')
  @ApiOperation({ summary: 'Lite patch attribute' })
  async patchAttribute(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Body() dto: LitePatchAttributeDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.patchAttribute(companyId, id, dto);
  }

  @Delete('attributes/:id')
  @ApiOperation({ summary: 'Lite delete attribute' })
  async deleteAttribute(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.catalog.deleteAttribute(companyId, id);
  }
}
