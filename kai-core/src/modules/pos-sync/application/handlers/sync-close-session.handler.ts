import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSessionCoreService } from '@modules/cash-sessions/application/cash-session-core.service';
import {
  PosSyncCommand,
  PosSyncCommandStatus,
} from '../../domain/pos-sync-command.entity';
import { SyncCloseSessionCommandDto } from '../dto/sync-close-session-command.dto';
import type { SyncCommandResponse } from '../sync-command.types';
import { TenantContext } from '@common/tenant/tenant.context';

@Injectable()
export class SyncCloseSessionHandler {
  constructor(
    private readonly coreService: CashSessionCoreService,
    @InjectRepository(PosSyncCommand)
    private readonly syncRepo: Repository<PosSyncCommand>,
  ) {}

  async execute(dto: SyncCloseSessionCommandDto): Promise<SyncCommandResponse> {
    const clientOperationId = dto.clientOperationId.trim();
    const companyId = TenantContext.getCompanyId();
    if (companyId) {
      await this.assertNoBlockingCommands(companyId, dto.cashSessionId, dto.deviceId);
    }

    const result = await this.coreService.closeByUserName(
      dto.cashSessionId,
      dto.userName,
      {
        cashHubId: dto.cashHubId,
        notes: dto.notes,
        counted: dto.counted,
      },
    );

    return {
      success: true,
      clientOperationId,
      transactionId: result.closingTransactionId ?? undefined,
    };
  }

  private async assertNoBlockingCommands(
    companyId: string,
    cashSessionId: string,
    deviceId: string,
  ): Promise<void> {
    const blocking = await this.syncRepo.count({
      where: {
        companyId,
        deviceId,
        cashSessionId,
        commandType: 'SALE',
        status: PosSyncCommandStatus.CONFLICT,
      },
    });

    const pending = await this.syncRepo.count({
      where: {
        companyId,
        deviceId,
        cashSessionId,
        commandType: 'SALE',
        status: PosSyncCommandStatus.PENDING,
      },
    });

    if (blocking > 0 || pending > 0) {
      throw new ConflictException(
        'Hay ventas offline pendientes o en conflicto para esta sesión. Sincronízalas antes de cerrar.',
      );
    }
  }
}
