import { Controller, Get, Query, Post, Body, Patch } from '@nestjs/common';
import { InventoryService } from '../application/inventory.service';
import {
  CreateAdjustmentDto,
  CreateTransferDto,
} from '../application/dto/stock-level.dto';
import { CurrentCompany } from '@common/tenant';
import { CurrentUser } from '@common/tenant/current-user.decorator';
import type { CurrentUserPayload } from '@common/tenant/current-user.decorator';
import { UpdateStockLevelThresholdsDto } from '../application/dto/update-stock-level-thresholds.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('filters')
  async getFilters() {
    return this.inventoryService.getFilters();
  }

  @Get('threshold-alerts')
  async getThresholdAlerts(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('storageId') storageId?: string,
  ) {
    const items = await this.inventoryService.getThresholdAlerts(
      companyId,
      storageId?.trim() || undefined,
      user.id,
    );
    return { items };
  }

  @Get('variant-lookup')
  async variantLookup(
    @Query('value') value: string,
    @Query('by') by: 'barcode' | 'sku',
  ) {
    return this.inventoryService.lookupVariantByCode(value, by);
  }

  @Get('stock-movements')
  async getStockMovements(
    @CurrentCompany() companyId: string,
    @Query('variantId') variantId: string,
    @Query('storageId') storageId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getStockMovementsPaginated({
      companyId,
      variantId,
      storageId: storageId?.trim() || undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Get()
  async getInventory(
    @Query()
    params: {
      search?: string;
      branchId?: string;
      storageId?: string;
      page?: string;
      limit?: string;
      sortField?: string;
      sort?: string;
      'stock-alerts'?: string;
    },
  ) {
    return this.inventoryService.search({
      search: params.search,
      branchId: params.branchId,
      storageId: params.storageId,
      stockAlerts: params['stock-alerts'],
      page: params.page ? parseInt(params.page, 10) : 1,
      limit: params.limit ? parseInt(params.limit, 10) : 25,
      sortField: params.sortField || 'productName',
      sort: params.sort === 'desc' ? 'desc' : 'asc',
    });
  }

  @Post('adjust')
  async adjust(@Body() data: CreateAdjustmentDto) {
    return this.inventoryService.adjust(data);
  }

  @Post('transfer')
  async transfer(@Body() data: CreateTransferDto) {
    return this.inventoryService.transfer(data);
  }

  @Patch('stock-levels/thresholds')
  async updateStockLevelThresholds(
    @CurrentCompany() companyId: string,
    @Body() body: UpdateStockLevelThresholdsDto,
  ) {
    return this.inventoryService.updateStockLevelThresholds(companyId, body);
  }
}
