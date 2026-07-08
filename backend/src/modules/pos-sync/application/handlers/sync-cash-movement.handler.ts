import { Injectable } from '@nestjs/common';
import { CashSessionsService } from '@modules/cash-sessions/application/cash-sessions.service';
import { SyncCashMovementCommandDto } from '../dto/sync-cash-movement-command.dto';
import type { SyncCommandResponse } from '../sync-command.types';

@Injectable()
export class SyncCashMovementHandler {
  constructor(private readonly cashSessionsService: CashSessionsService) {}

  async execute(dto: SyncCashMovementCommandDto): Promise<SyncCommandResponse> {
    const clientOperationId = dto.clientOperationId.trim();
    const input = {
      userName: dto.userName,
      pointOfSaleId: dto.pointOfSaleId,
      cashSessionId: dto.cashSessionId,
      amount: dto.amount,
      reason: dto.reason ?? null,
    };

    const result =
      dto.direction === 'DEPOSIT'
        ? await this.cashSessionsService.registerCashDeposit(input)
        : await this.cashSessionsService.registerCashWithdrawal(input);

    return {
      success: true,
      clientOperationId,
      transactionId: result.transaction?.id,
      documentNumber: result.transaction?.documentNumber,
    };
  }
}
