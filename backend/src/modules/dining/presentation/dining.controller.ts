import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DiningService } from '../application/dining.service';
import { CreateDiningRoomDto } from '../application/dto/create-dining-room.dto';
import { UpdateDiningRoomDto } from '../application/dto/update-dining-room.dto';
import { UpdateFloorPlanDto } from '../application/dto/update-floor-plan.dto';
import { UpsertDiningTablesDto } from '../application/dto/upsert-dining-tables.dto';
import {
  AddOrderItemsDto,
  CloseDiningOrderDto,
  MarkKitchenFireReadyDto,
  OpenCounterOrderDto,
  OpenTableDto,
  OpenTakeawayOrderDto,
  SendToKitchenDto,
  TransferCartLineDto,
  UpdateDiningOrderLineDto,
  UpdateDiningOrderProfileDto,
} from '../application/dto/dining-order-commands.dto';
import { UpdateDiningNumberingSettingsDto } from '../application/dto/update-dining-numbering-settings.dto';
import { DiningOrderKind, DiningOrderStatus } from '../domain/dining.enums';

@Controller('dining')
export class DiningController {
  constructor(private readonly diningService: DiningService) {}

  // ─── F1: Configuration ──────────────────────────────────────────────

  @Get('rooms')
  async listRooms(
    @Query('branchId') branchId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const include =
      includeInactive === 'true' || includeInactive === '1';
    return this.diningService.findAllRooms({
      branchId: branchId?.trim() || undefined,
      includeInactive: include,
    });
  }

  @Post('rooms')
  async createRoom(@Body() dto: CreateDiningRoomDto) {
    return this.diningService.createRoom({
      branchId: dto.branchId,
      name: dto.name,
      isActive: dto.isActive,
    });
  }

  @Get('rooms/:id')
  async getRoom(@Param('id') id: string) {
    const room = await this.diningService.findRoomById(id);
    if (!room) {
      return {
        success: false,
        message: 'Salón no encontrado',
        statusCode: 404,
      };
    }
    return room;
  }

  @Patch('rooms/:id')
  async updateRoom(
    @Param('id') id: string,
    @Body() dto: UpdateDiningRoomDto,
  ) {
    return this.diningService.updateRoom(id, {
      branchId: dto.branchId,
      name: dto.name,
      isActive: dto.isActive,
    });
  }

  @Put('rooms/:id/floor-plan')
  async updateFloorPlan(
    @Param('id') id: string,
    @Body() dto: UpdateFloorPlanDto,
  ) {
    return this.diningService.updateFloorPlan(id, dto.floorPlan);
  }

  @Put('rooms/:id/tables')
  async upsertTables(
    @Param('id') id: string,
    @Body() dto: UpsertDiningTablesDto,
  ) {
    return this.diningService.upsertTables(id, dto.tables);
  }

  @Get('branches/:branchId/numbering-settings')
  async getNumberingSettings(@Param('branchId') branchId: string) {
    return this.diningService.getNumberingSettings(branchId);
  }

  @Patch('branches/:branchId/numbering-settings')
  async updateNumberingSettings(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateDiningNumberingSettingsDto,
  ) {
    return this.diningService.updateNumberingSettings(branchId, {
      timezone: dto.timezone,
      resetTimeLocal: dto.resetTimeLocal,
      allowWaiterOpenTable: dto.allowWaiterOpenTable,
      allowPosOpenTable: dto.allowPosOpenTable,
      posAccountsMenuCategoryIds: dto.posAccountsMenuCategoryIds,
    });
  }

  // ─── F2: Runtime commands ───────────────────────────────────────────

  @Post('orders/open-table')
  async openTable(@Body() dto: OpenTableDto) {
    return this.diningService.openTable({
      branchId: dto.branchId,
      diningTableId: dto.diningTableId,
      openedFrom: dto.openedFrom,
      profile: dto.profile,
    });
  }

  @Post('orders/open-counter')
  async openCounter(@Body() dto: OpenCounterOrderDto) {
    return this.diningService.openCounter({
      branchId: dto.branchId,
      profile: dto.profile,
    });
  }

  @Post('orders/open-takeaway')
  async openTakeaway(@Body() dto: OpenTakeawayOrderDto) {
    return this.diningService.openTakeaway({
      branchId: dto.branchId,
      profile: dto.profile,
    });
  }

  @Post('orders/transfer-cart-line')
  async transferCartLine(@Body() dto: TransferCartLineDto) {
    return this.diningService.transferCartLine({
      diningOrderId: dto.diningOrderId,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
      notes: dto.notes,
    });
  }

  @Get('kitchen-queue')
  async kitchenQueue(@Query('productionUnitId') productionUnitId: string) {
    if (!productionUnitId?.trim()) {
      return {
        success: false,
        message: 'productionUnitId es obligatorio',
        statusCode: 400,
      };
    }
    return this.diningService.getKitchenQueue(productionUnitId.trim());
  }

  @Get('orders')
  async listOrders(
    @Query('branchId') branchId?: string,
    @Query('kind') kind?: DiningOrderKind,
    @Query('status') status?: DiningOrderStatus,
  ) {
    return this.diningService.listActiveOrders({
      branchId: branchId?.trim() || undefined,
      kind,
      status,
    });
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    return this.diningService.getOrderDetail(id);
  }

  @Patch('orders/:id/profile')
  async updateOrderProfile(
    @Param('id') id: string,
    @Body() dto: UpdateDiningOrderProfileDto,
  ) {
    return this.diningService.updateOrderProfile(id, {
      customerName: dto.customerName,
    });
  }

  @Post('orders/:id/items')
  async addItems(
    @Param('id') id: string,
    @Body() dto: AddOrderItemsDto,
  ) {
    return this.diningService.addOrderItems(id, dto.items);
  }

  @Patch('orders/:orderId/lines/:lineId')
  async updateOrderLine(
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateDiningOrderLineDto,
  ) {
    return this.diningService.updateOrderLineNotes(orderId, lineId, {
      notes: dto.notes,
    });
  }

  @Post('orders/:id/send-to-kitchen')
  async sendToKitchen(
    @Param('id') id: string,
    @Body() dto?: SendToKitchenDto,
  ) {
    return this.diningService.sendToKitchen(id, dto?.lineIds);
  }

  @Post('orders/:id/request-bill')
  async requestBill(@Param('id') id: string) {
    return this.diningService.requestBill(id);
  }

  @Post('orders/:id/close')
  async closeOrder(
    @Param('id') id: string,
    @Body() dto: CloseDiningOrderDto,
  ) {
    return this.diningService.closeDiningOrder(id, dto.linkedTransactionId);
  }

  @Post('orders/:id/items/:lineId/ready')
  async markReady(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.diningService.markKitchenItemReady(id, lineId);
  }

  @Post('orders/:id/fires/:fireId/ready')
  async markFireReady(
    @Param('id') id: string,
    @Param('fireId') fireId: string,
    @Body() dto: MarkKitchenFireReadyDto,
  ) {
    return this.diningService.markKitchenFireReady(
      id,
      fireId,
      dto.productionUnitId,
    );
  }

  @Post('orders/:id/items/:lineId/served')
  async markServed(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.diningService.markItemServed(id, lineId);
  }

  @Post('orders/:id/items/:lineId/cancel')
  async cancelItem(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.diningService.cancelOrderItem(id, lineId);
  }
}
