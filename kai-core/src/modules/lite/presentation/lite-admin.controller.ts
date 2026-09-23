import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenant } from '@common/tenant';
import { LiteCommerceService } from '../application/lite-commerce.service';
import { LiteOpsService } from '../application/lite-ops.service';
import { LiteStockService } from '../application/lite-stock.service';
import { LiteCompanyResolver } from '../application/lite-company.resolver';
import {
  LiteCashMovementDto,
  LiteCloseCashSessionDto,
  LiteOpenCashSessionDto,
} from '../application/dto/lite-cash-session.dto';
import { LiteReceptionDto } from '../application/dto/lite-reception.dto';
import { LiteStockAdjustDto, LiteStockDeltaDto, LiteStockTransferDto } from '../application/dto/lite-stock-adjust.dto';
import { LitePatchCompanyDto } from '../application/dto/lite-company-patch.dto';
import { LitePatchPosCurrentDto } from '../application/dto/lite-pos-current.dto';
import { LiteCreateUserDto } from '../application/dto/lite-create-user.dto';
import { LiteSaleVoidDto } from '../application/dto/lite-sale-void.dto';

@ApiTags('Lite')
@ApiBearerAuth('JWT-auth')
@SkipTenant()
@Controller('lite')
export class LiteAdminController {
  constructor(
    private readonly commerce: LiteCommerceService,
    private readonly ops: LiteOpsService,
    private readonly stock: LiteStockService,
    private readonly companies: LiteCompanyResolver,
  ) {}

  @Get('stock')
  @ApiOperation({ summary: 'Lite stock levels' })
  async stockList(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.stock.listStock(companyId);
  }

  @Post('stock/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite set absolute physical stock (target qty)' })
  async stockAdjust(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteStockAdjustDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    const physicalStock = await this.stock.setPhysicalStock(
      companyId,
      dto.variantId,
      dto.storageId ?? null,
      dto.targetQty,
    );
    return {
      variantId: dto.variantId,
      physicalStock,
      note: dto.note ?? null,
    };
  }

  @Post('stock/delta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite relative stock delta (+/−) at a storage' })
  async stockDelta(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteStockDeltaDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    const physicalStock = await this.stock.applyDelta(
      companyId,
      dto.variantId,
      dto.storageId,
      dto.delta,
    );
    return {
      variantId: dto.variantId,
      storageId: dto.storageId,
      delta: dto.delta,
      physicalStock,
      note: dto.note ?? null,
    };
  }

  @Post('stock/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite transfer stock between storages' })
  async stockTransfer(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteStockTransferDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    const result = await this.stock.transfer(companyId, {
      variantId: dto.variantId,
      sourceStorageId: dto.sourceStorageId,
      targetStorageId: dto.targetStorageId,
      quantity: dto.quantity,
    });
    return {
      ...result,
      sourceStorageId: dto.sourceStorageId,
      targetStorageId: dto.targetStorageId,
      note: dto.note ?? null,
    };
  }

  @Get('customers')
  @ApiOperation({ summary: 'Lite customers (legacy; not in Admin Lite UI)' })
  async customers(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listCustomers(companyId);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Lite suppliers (legacy; not in Admin Lite UI)' })
  async suppliers(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listSuppliers(companyId);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Lite sales (persisted transactions)' })
  async sales(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listSales(companyId);
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Lite sale detail' })
  async sale(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.getSale(companyId, id);
  }

  @Post('sales/:id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite void sale (VOIDED + restore PHYSICAL stock)' })
  async voidSale(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Body() dto: LiteSaleVoidDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.commerce.voidSale(
      ctx.companyId,
      id,
      ctx.userId,
      dto.reason,
    );
  }

  @Get('receptions')
  @ApiOperation({ summary: 'Lite receptions list (legacy)' })
  async receptions(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listReceptions(companyId);
  }

  @Post('receptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite goods reception alias (legacy)' })
  async createReception(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteReceptionDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.createReception(companyId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Lite dashboard counters' })
  async dashboard(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.getDashboard(companyId);
  }

  @Get('company')
  @ApiOperation({ summary: 'Lite company + branch + storage + POS summary' })
  async company(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.getCompanySummary(companyId);
  }

  @Patch('company')
  @ApiOperation({ summary: 'Lite patch company' })
  async patchCompany(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LitePatchCompanyDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.patchCompany(companyId, dto);
  }

  @Get('points-of-sale')
  @ApiOperation({ summary: 'Lite points of sale' })
  async pointsOfSale(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.listPointsOfSale(companyId);
  }

  @Get('points-of-sale/current')
  @ApiOperation({ summary: 'Lite single POS (current)' })
  async posCurrent(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.getCurrentPointOfSale(companyId);
  }

  @Patch('points-of-sale/current')
  @ApiOperation({ summary: 'Lite patch single POS' })
  async patchPosCurrent(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LitePatchPosCurrentDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.patchCurrentPointOfSale(companyId, dto);
  }

  @Get('cash-sessions')
  @ApiOperation({ summary: 'Lite cash sessions' })
  async cashSessions(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.listCashSessions(companyId);
  }

  @Get('cash-sessions/:id/movements')
  @ApiOperation({ summary: 'Lite cash session movements (sales + cash in/out)' })
  async cashSessionMovements(
    @Headers('authorization') auth: string | undefined,
    @Param('id') sessionId: string,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.listCashSessionMovements(companyId, sessionId);
  }

  @Post('cash-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open Lite cash session' })
  async openCashSession(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteOpenCashSessionDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.ops.openCashSession({
      companyId: ctx.companyId,
      pointOfSaleId: dto.pointOfSaleId,
      openingAmount: dto.openingAmount,
      openedById: ctx.userId,
    });
  }

  @Post('cash-sessions/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close Lite cash session' })
  async closeCashSession(
    @Headers('authorization') auth: string | undefined,
    @Param('id') sessionId: string,
    @Body() dto: LiteCloseCashSessionDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.ops.closeCashSession({
      companyId: ctx.companyId,
      sessionId,
      closingAmount: dto.closingAmount,
      closedById: ctx.userId,
      countsByMethod: dto.countsByMethod,
    });
  }

  @Post('cash-sessions/:id/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lite cash session deposit (ingreso; sin cash hub)',
  })
  async cashSessionDeposit(
    @Headers('authorization') auth: string | undefined,
    @Param('id') sessionId: string,
    @Body() dto: LiteCashMovementDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.ops.registerCashDeposit({
      companyId: ctx.companyId,
      sessionId,
      amount: dto.amount,
      reason: dto.reason,
      userId: ctx.userId,
    });
  }

  @Post('cash-sessions/:id/withdrawal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lite cash session withdrawal (egreso; sin cash hub)',
  })
  async cashSessionWithdrawal(
    @Headers('authorization') auth: string | undefined,
    @Param('id') sessionId: string,
    @Body() dto: LiteCashMovementDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.ops.registerCashWithdrawal({
      companyId: ctx.companyId,
      sessionId,
      amount: dto.amount,
      reason: dto.reason,
      userId: ctx.userId,
    });
  }

  @Get('users')
  @ApiOperation({ summary: 'Lite company users' })
  async users(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.listUsers(companyId);
  }

  @Post('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Lite company user' })
  async createUser(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteCreateUserDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.ops.createUser(companyId, dto);
  }
}
