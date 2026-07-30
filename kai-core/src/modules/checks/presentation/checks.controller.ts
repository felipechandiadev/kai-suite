import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
} from '@common/tenant';
import { ChecksService } from '../application/checks.service';
import { ChecksReconciliationService } from '../application/checks-reconciliation.service';
import {
  BounceCheckDto,
  ClearCheckDto,
  CreateCheckDto,
  DepositCheckDto,
  EndorseCheckDto,
  ListChecksQueryDto,
  MatchCheckMovementDto,
  VoidCheckDto,
} from '../application/dto/check.dtos';

@Controller('checks')
export class ChecksController {
  constructor(
    private readonly checksService: ChecksService,
    private readonly reconciliation: ChecksReconciliationService,
  ) {}

  @Get('treasury/committed-outgoing')
  async committedOutgoing(@CurrentCompany() companyId: string) {
    const summary =
      await this.checksService.getCommittedOutgoingSummary(companyId);
    return { success: true, summary };
  }

  @Get()
  async list(
    @Query() q: ListChecksQueryDto,
    @CurrentCompany() companyId: string,
  ) {
    const { items, total } = await this.checksService.list({
      companyId,
      status: q.status,
      direction: q.direction,
      dueDateFrom: q.dueDateFrom,
      dueDateTo: q.dueDateTo,
      search: q.search,
      payeeId: q.payeeId,
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    });
    return { success: true, items, total };
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const detail = await this.checksService.getDetail(id, companyId);
    return { success: true, ...detail };
  }

  @Post()
  async create(
    @Body() body: CreateCheckDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.checksService.createManual(
      companyId,
      user.id,
      body,
    );
    return { success: true, check };
  }

  @Post(':id/deposit')
  async deposit(
    @Param('id') id: string,
    @Body() body: DepositCheckDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.checksService.deposit(id, companyId, user.id, body);
    return { success: true, check };
  }

  @Post(':id/clear')
  async clear(
    @Param('id') id: string,
    @Body() body: ClearCheckDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.checksService.clear(id, companyId, user.id, body);
    return { success: true, check };
  }

  @Post(':id/bounce')
  async bounce(
    @Param('id') id: string,
    @Body() body: BounceCheckDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.checksService.bounce(id, companyId, user.id, body);
    return { success: true, check };
  }

  @Post(':id/void')
  async void(
    @Param('id') id: string,
    @Body() body: VoidCheckDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.checksService.void(id, companyId, user.id, body);
    return { success: true, check };
  }

  @Post(':id/endorse')
  async endorse(
    @Param('id') id: string,
    @Body() body: EndorseCheckDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.checksService.endorse(id, companyId, user.id, body);
    return { success: true, check };
  }

  /**
   * Conciliación manual: asocia un movimiento bancario al cheque y fuerza
   * la transición a CLEARED.
   */
  @Post(':id/match-movement')
  async matchMovement(
    @Param('id') id: string,
    @Body() body: MatchCheckMovementDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const check = await this.reconciliation.matchManually(
      id,
      companyId,
      body.bankMovementId,
      user.id,
    );
    return { success: true, check };
  }
}
