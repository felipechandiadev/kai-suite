import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateInventoryCountCommand } from '../../application/commands/create-inventory-count.usecase';
import { CreateInventoryReservationCommand } from '../../application/commands/create-inventory-reservation.usecase';
import { CreateInventoryReservationsCommand } from '../../application/commands/create-inventory-reservations.usecase';
import { CreateInventoryBlockCommand } from '../../application/commands/create-inventory-block.usecase';
import { CreateInventoryUnblockCommand } from '../../application/commands/create-inventory-unblock.usecase';
import {
  GetActiveInventoryReservationsQuery,
  GetInventoryBlocksQuery,
  GetInventoryCountsQuery,
} from '../../application/queries/inventory/index';
import {
  CreateInventoryCountDto,
  CreateInventoryReservationDto,
  CreateInventoryReservationsDto,
  CreateInventoryBlockDto,
  CreateInventoryUnblockDto,
} from '../../application/dto/inventory.dto';
import { InventoryReservationSummary } from '../../application/queries/inventory/get-active-inventory-reservations.query';
import { InventoryBlockSummary } from '../../application/queries/inventory/get-inventory-blocks.query';
import { InventoryCountSummary } from '../../application/queries/inventory/get-inventory-counts.query';

@ApiTags('Inventory Transactions')
@Controller('inventory-transactions')
export class InventoryTransactionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('count')
  @ApiOperation({ summary: 'Create inventory count transaction' })
  @ApiResponse({
    status: 201,
    description: 'Inventory count created successfully',
  })
  async createInventoryCount(
    @Body() dto: CreateInventoryCountDto,
  ): Promise<{ transactionId: string }> {
    const command = new CreateInventoryCountCommand(dto, 'system-user'); // TODO: Get from auth
    const transactionId = await this.commandBus.execute(command);
    return { transactionId };
  }

  @Post('reservation')
  @ApiOperation({ summary: 'Create inventory reservation transaction' })
  @ApiResponse({
    status: 201,
    description: 'Inventory reservation created successfully',
  })
  async createInventoryReservation(
    @Body() dto: CreateInventoryReservationDto,
  ): Promise<{ transactionId: string }> {
    const command = new CreateInventoryReservationCommand(dto, 'system-user'); // TODO: Get from auth
    const transactionId = await this.commandBus.execute(command);
    return { transactionId };
  }

  @Post('reservations')
  @ApiOperation({ summary: 'Create inventory reservation transaction (multi-line)' })
  @ApiResponse({
    status: 201,
    description: 'Inventory reservations created successfully',
  })
  async createInventoryReservations(
    @Body() dto: CreateInventoryReservationsDto,
  ): Promise<{ transactionId: string }> {
    const command = new CreateInventoryReservationsCommand(dto, 'system-user'); // TODO: Get from auth
    const transactionId = await this.commandBus.execute(command);
    return { transactionId };
  }

  @Post('block')
  @ApiOperation({ summary: 'Create inventory block transaction' })
  @ApiResponse({
    status: 201,
    description: 'Inventory block created successfully',
  })
  async createInventoryBlock(
    @Body() dto: CreateInventoryBlockDto,
  ): Promise<{ transactionId: string }> {
    const command = new CreateInventoryBlockCommand(dto, 'system-user'); // TODO: Get from auth
    const transactionId = await this.commandBus.execute(command);
    return { transactionId };
  }

  @Post('unblock')
  @ApiOperation({ summary: 'Create inventory unblock transaction' })
  @ApiResponse({
    status: 201,
    description: 'Inventory unblock created successfully',
  })
  async createInventoryUnblock(
    @Body() dto: CreateInventoryUnblockDto,
  ): Promise<{ transactionId: string }> {
    const command = new CreateInventoryUnblockCommand(dto, 'system-user'); // TODO: Get from auth
    const transactionId = await this.commandBus.execute(command);
    return { transactionId };
  }

  @Get('reservations')
  @ApiOperation({ summary: 'Get active inventory reservations' })
  @ApiResponse({
    status: 200,
    description: 'Active reservations retrieved successfully',
  })
  async getActiveReservations(
    @Query('branchId') branchId?: string,
    @Query('storageId') storageId?: string,
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
    @Query('customerId') customerId?: string,
  ): Promise<InventoryReservationSummary[]> {
    const query = new GetActiveInventoryReservationsQuery(
      branchId,
      storageId,
      productId,
      variantId,
      customerId,
    );
    return this.queryBus.execute(query);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get inventory blocks' })
  @ApiResponse({
    status: 200,
    description: 'Inventory blocks retrieved successfully',
  })
  async getInventoryBlocks(
    @Query('branchId') branchId?: string,
    @Query('storageId') storageId?: string,
    @Query('productId') productId?: string,
    @Query('reason') reason?: string,
    @Query('status')
    status?: 'ACTIVE' | 'PARTIALLY_UNBLOCKED' | 'FULLY_UNBLOCKED',
  ): Promise<InventoryBlockSummary[]> {
    const query = new GetInventoryBlocksQuery(
      branchId,
      storageId,
      productId,
      reason,
      status,
    );
    return this.queryBus.execute(query);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get inventory counts' })
  @ApiResponse({
    status: 200,
    description: 'Inventory counts retrieved successfully',
  })
  async getInventoryCounts(
    @Query('branchId') branchId?: string,
    @Query('storageId') storageId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('hasDifferences') hasDifferences?: boolean,
  ): Promise<InventoryCountSummary[]> {
    const query = new GetInventoryCountsQuery(
      branchId,
      storageId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      hasDifferences,
    );
    return this.queryBus.execute(query);
  }
}
