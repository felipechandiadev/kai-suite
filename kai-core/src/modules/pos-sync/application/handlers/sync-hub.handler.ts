import { Injectable } from '@nestjs/common';
import { CashSessionCoreService } from '@modules/cash-sessions/application/cash-session-core.service';
import { User } from '@modules/users/domain/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  SyncHubDepositCommandDto,
  SyncHubWithdrawalCommandDto,
} from '../dto/sync-hub-command.dto';
import type { SyncCommandResponse } from '../sync-command.types';

@Injectable()
export class SyncHubHandler {
  constructor(
    private readonly coreService: CashSessionCoreService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async executeDeposit(
    dto: SyncHubDepositCommandDto,
  ): Promise<SyncCommandResponse> {
    const clientOperationId = dto.clientOperationId.trim();
    const userId = await this.resolveUserId(dto.userName);
    const result = await this.coreService.depositCashFromHub({
      cashSessionId: dto.cashSessionId,
      cashHubId: dto.cashHubId,
      amount: dto.amount,
      userId,
      reason: dto.reason,
    });
    return {
      success: true,
      clientOperationId,
      transactionId: result?.transaction?.id,
      documentNumber: result?.transaction?.documentNumber,
    };
  }

  async executeWithdrawal(
    dto: SyncHubWithdrawalCommandDto,
  ): Promise<SyncCommandResponse> {
    const clientOperationId = dto.clientOperationId.trim();
    const userId = await this.resolveUserId(dto.userName);
    const result = await this.coreService.withdrawCashSessionToHub({
      cashSessionId: dto.cashSessionId,
      cashHubId: dto.cashHubId,
      amount: dto.amount,
      userId,
      reason: dto.reason,
    });
    return {
      success: true,
      clientOperationId,
      transactionId: result?.transaction?.id,
      documentNumber: result?.transaction?.documentNumber,
    };
  }

  private async resolveUserId(userName: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { userName, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${userName} no encontrado`);
    }
    return user.id;
  }
}
