import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '@common/tenant/current-user.decorator';
import type { CurrentUserPayload } from '@common/tenant/current-user.decorator';
import { CashSessionsService } from '../application/cash-sessions.service';
import { CashSessionIntegrityService } from '../application/cash-session-integrity.service';
import { CashSessionCoreService } from '../application/cash-session-core.service';
import { SalesFromSessionService } from '../application/sales-from-session.service';
import { OpeningTransactionDto } from '../application/dto/opening-transaction.dto';
import { GetCashSessionsDto } from '../application/dto/get-cash-sessions.dto';
import { OpenCashSessionDto } from '../application/dto/open-cash-session.dto';
import { CreateSaleDto } from '../application/dto/create-sale.dto';
import { CollectPendingSalesDto } from '../application/dto/collect-pending-sales.dto';
import { CollectPendingQuotasDto } from '../application/dto/collect-pending-quotas.dto';
import { PayoutCustomerCreditNotesDto } from '../application/dto/payout-customer-credit-notes.dto';
import { CreateBackorderDto } from '../application/dto/create-backorder.dto';
import {
  ConfirmCustomerReturnDocumentDto,
  ConfirmCustomerReturnRefundDto,
} from '../application/dto/create-sale-return.dto';
import { RegisterCashMovementDto } from '../application/dto/register-cash-movement.dto';
import { CloseCashSessionDto } from '../application/dto/close-cash-session.dto';
import { DepositCashFromHubBodyDto } from '../application/dto/deposit-cash-from-hub.dto';
import { WithdrawCashToHubBodyDto } from '../application/dto/withdraw-cash-to-hub.dto';

@Controller('cash-sessions')
export class CashSessionsController {
  constructor(
    // New refactored services (preferred)
    private readonly coreService: CashSessionCoreService,
    private readonly salesService: SalesFromSessionService,
    // Old services (maintained for backward compatibility)
    private readonly cashSessionsService: CashSessionsService,
    private readonly integrityService: CashSessionIntegrityService,
  ) {}

  /**
   * UPDATED: Use new CashSessionCoreService
   */
  @Get()
  async findAll(@Query() query: GetCashSessionsDto) {
    return this.coreService.findAll(query);
  }

  @Get('cash-hubs-by-pos')
  async listCashHubsByPos(@Query('pointOfSaleId') pointOfSaleId: string) {
    const id = pointOfSaleId?.trim();
    if (!id) {
      throw new BadRequestException('pointOfSaleId es obligatorio');
    }
    return this.coreService.listCashHubsForPointOfSale(id);
  }

  @Get(':id/movements')
  async getMovements(@Param('id') id: string) {
    return this.coreService.listMovementsForSession(id);
  }

  /**
   * UPDATED: Use new SalesFromSessionService
   */
  @Get(':id/sales')
  async getSales(@Param('id') id: string) {
    return this.salesService.getSalesForSession(id);
  }

  @Get(':id/cash-hubs-for-deposit')
  async listCashHubsForDeposit(@Param('id') id: string) {
    return this.coreService.listCashHubsForSessionDeposit(id);
  }

  @Get(':id/available-cash')
  async getAvailableCash(@Param('id') id: string) {
    return this.coreService.getAvailableCashForOpenSession(id);
  }

  /**
   * UPDATED: Use new CashSessionCoreService
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.coreService.findOne(id);
  }

  /**
   * UPDATED: Use new CashSessionCoreService
   *
   * Now delegates to TransactionsService for CASH_SESSION_OPENING
   */
  @Post()
  async open(@Body() openDto: OpenCashSessionDto) {
    return this.coreService.open(openDto);
  }

  /**
   * UPDATED: Use new SalesFromSessionService
   *
   * Now delegates to TransactionsService for SALE + asientos generation
   */
  @Post('sales')
  async createSale(
    @Body() createSaleDto: CreateSaleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // El cajero es quien está autenticado; no se acepta el nombre que venga en el body.
    createSaleDto.userName = user.userName;
    return this.salesService.createSale(createSaleDto);
  }

  @Post('collect-pending-sales')
  async collectPendingSales(
    @Body() body: CollectPendingSalesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    body.userName = user.userName;
    return this.salesService.collectPendingSales(body);
  }

  @Post('collect-pending-quotas')
  async collectPendingQuotas(
    @Body() body: CollectPendingQuotasDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    body.userName = user.userName;
    return this.salesService.collectPendingQuotas(body);
  }

  @Post('payout-customer-credit-notes')
  async payoutCustomerCreditNotes(
    @Body() body: PayoutCustomerCreditNotesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    body.userName = user.userName;
    return this.salesService.payoutCustomerCreditNotes(body);
  }

  @Post('backorders')
  async createBackorder(
    @Body() createBackorderDto: CreateBackorderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    createBackorderDto.userName = user.userName;
    return this.salesService.createBackorder(createBackorderDto);
  }

  @Post('customer-returns/confirm-document')
  async confirmCustomerReturnDocument(@Body() body: ConfirmCustomerReturnDocumentDto) {
    return this.salesService.confirmCustomerReturnWithCreditNote(body);
  }

  @Post('customer-returns/confirm-refund')
  async confirmCustomerReturnRefund(@Body() body: ConfirmCustomerReturnRefundDto) {
    return this.salesService.confirmCustomerReturnWithImmediateRefund(body);
  }

  @Post(':id/cash-deposits-from-hub')
  async depositFromHub(
    @Param('id') id: string,
    @Body() body: DepositCashFromHubBodyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.coreService.depositCashFromHub({
      cashSessionId: id,
      cashHubId: body.cashHubId,
      amount: body.amount,
      userId: user.id,
      reason: body.reason,
    });
  }

  @Post(':id/cash-withdrawals-to-hub')
  async withdrawToHub(
    @Param('id') id: string,
    @Body() body: WithdrawCashToHubBodyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.coreService.withdrawCashSessionToHub({
      cashSessionId: id,
      cashHubId: body.cashHubId,
      amount: body.amount,
      userId: user.id,
      reason: body.reason,
    });
  }

  /**
   * TODO: Deprecated - Use open() endpoint instead
   * or implement via CashSessionCoreService
   */
  @Post('opening-transaction')
  async registerOpeningTransaction(@Body() dto: OpeningTransactionDto) {
    // Delegate to old service for now (backward compatibility)
    return this.cashSessionsService.registerOpeningTransaction(dto);
  }

  /**
   * TODO: Deprecated - Analyze if needed
   * Potentially use CapitalContributionsService or CashDepositsService
   */
  @Post('cash-deposits')
  async registerCashDeposit(
    @Body() dto: RegisterCashMovementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    dto.userName = user.userName;
    return this.cashSessionsService.registerCashDeposit(dto);
  }

  /**
   * TODO: Deprecated - Analyze if needed
   */
  @Post('cash-withdrawals')
  async registerCashWithdrawal(
    @Body() dto: RegisterCashMovementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    dto.userName = user.userName;
    return this.cashSessionsService.registerCashWithdrawal(dto);
  }

  /**
   * UPDATED: Use new CashSessionCoreService
   *
   * Now delegates to TransactionsService for CASH_SESSION_CLOSING
   */
  @Post('close')
  async close(
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    const sessionId = dto.sessionId || dto.cashSessionId;
    // Un cierre normal lo hace quien está autenticado; solo el cierre administrativo
    // (validado por rol en el servicio) puede indicar a otro usuario.
    const asAdmin = dto.adminClose === true;
    const userId = asAdmin ? dto.userId || dto.closedById || dto.user?.id : currentUser.id;
    const userName = asAdmin ? dto.userName : undefined;

    if (!sessionId) {
      throw new BadRequestException(
        'sessionId es requerido para cerrar la sesión',
      );
    }

    if (userId) {
      return this.coreService.close(sessionId, userId, {
        cashHubId: dto.cashHubId,
        notes: dto.notes,
        counted: dto.counted,
        adminClose: dto.adminClose === true,
      });
    }

    if (userName) {
      return this.coreService.closeByUserName(sessionId, userName, {
        cashHubId: dto.cashHubId,
        notes: dto.notes,
        counted: dto.counted,
        adminClose: dto.adminClose === true,
      });
    }

    throw new BadRequestException(
      'userId o userName es requerido para cerrar la sesión',
    );
  }

  @Get('integrity/check')
  async checkIntegrity() {
    return this.integrityService.validateIntegrity();
  }

  @Post('integrity/cleanup')
  async cleanupIntegrity() {
    return this.integrityService.cleanupCorruptSessions();
  }
}
