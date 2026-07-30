import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import {
  PosSyncCommand,
  PosSyncCommandStatus,
} from '../domain/pos-sync-command.entity';
import { SyncSaleCommandDto } from './dto/sync-sale-command.dto';
import { SyncCashMovementCommandDto } from './dto/sync-cash-movement-command.dto';
import {
  SyncHubDepositCommandDto,
  SyncHubWithdrawalCommandDto,
} from './dto/sync-hub-command.dto';
import { SyncCloseSessionCommandDto } from './dto/sync-close-session-command.dto';
import { SyncSaleHandler } from './handlers/sync-sale.handler';
import { SyncCashMovementHandler } from './handlers/sync-cash-movement.handler';
import { SyncHubHandler } from './handlers/sync-hub.handler';
import { SyncCloseSessionHandler } from './handlers/sync-close-session.handler';
import {
  POS_SYNC_COMMAND_TYPES,
  type PosSyncCommandType,
  type SyncCommandResponse,
} from './sync-command.types';
import { TenantContext } from '@common/tenant/tenant.context';

type SyncCommandDtoUnion =
  | SyncSaleCommandDto
  | SyncCashMovementCommandDto
  | SyncHubDepositCommandDto
  | SyncHubWithdrawalCommandDto
  | SyncCloseSessionCommandDto;

@Injectable()
export class PosSyncService {
  private readonly logger = new Logger(PosSyncService.name);

  constructor(
    @InjectRepository(PosSyncCommand)
    private readonly syncRepo: Repository<PosSyncCommand>,
    private readonly saleHandler: SyncSaleHandler,
    private readonly cashMovementHandler: SyncCashMovementHandler,
    private readonly hubHandler: SyncHubHandler,
    private readonly closeSessionHandler: SyncCloseSessionHandler,
  ) {}

  /** @deprecated Use syncCommand */
  async syncSaleCommand(dto: SyncSaleCommandDto): Promise<SyncCommandResponse> {
    return this.syncCommand(dto as unknown as Record<string, unknown>);
  }

  async syncCommandBatch(
    bodies: Record<string, unknown>[],
  ): Promise<{ success: true; results: SyncCommandResponse[] }> {
    const slice = bodies.slice(0, 10);
    const results: SyncCommandResponse[] = [];
    for (const body of slice) {
      results.push(await this.syncCommand(body));
    }
    return { success: true, results };
  }

  async syncCommand(body: Record<string, unknown>): Promise<SyncCommandResponse> {
    const startedAt = Date.now();
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }

    const commandType = String(body.commandType ?? '').trim() as PosSyncCommandType;
    if (!POS_SYNC_COMMAND_TYPES.includes(commandType)) {
      throw new BadRequestException(`commandType no soportado: ${commandType}`);
    }

    const dto = await this.validateDto(commandType, body);
    const clientOperationId = dto.clientOperationId.trim();
    const deviceId = dto.deviceId.trim();
    if (!clientOperationId || !deviceId) {
      throw new BadRequestException('clientOperationId y deviceId son requeridos');
    }

    return this.syncRepo.manager.transaction(async (em) => {
      const repo = em.getRepository(PosSyncCommand);
      let row = await repo
        .createQueryBuilder('c')
        .setLock('pessimistic_write')
        .where('c.companyId = :companyId AND c.clientOperationId = :clientOperationId', {
          companyId,
          clientOperationId,
        })
        .getOne();

      if (row?.responseJson) {
        this.logSyncResult({
          clientOperationId,
          deviceId,
          commandType,
          status: row.status,
          durationMs: Date.now() - startedAt,
          cached: true,
        });
        return row.responseJson as SyncCommandResponse;
      }

      if (!row) {
        row = repo.create({
          companyId,
          clientOperationId,
          deviceId,
          commandType: dto.commandType,
          cashSessionId: dto.cashSessionId,
          status: PosSyncCommandStatus.PENDING,
        });
        await repo.save(row);
      }

      try {
        const response = await this.dispatch(companyId, dto);
        row.transactionId = response.transactionId ?? null;
        row.cashSessionId = dto.cashSessionId;
        row.status = response.success
          ? PosSyncCommandStatus.SYNCED
          : PosSyncCommandStatus.FAILED;
        row.responseJson = {
          ...response,
          cashSessionId: dto.cashSessionId,
          commandType: dto.commandType,
        } as Record<string, unknown>;
        await repo.save(row);
        this.logSyncResult({
          clientOperationId,
          deviceId,
          commandType,
          status: row.status,
          durationMs: Date.now() - startedAt,
        });
        return response;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error al sincronizar';
        const isStockConflict =
          e instanceof BadRequestException && /stock insuficiente/i.test(message);
        const isConflict = e instanceof ConflictException || isStockConflict;
        const response: SyncCommandResponse = {
          success: false,
          clientOperationId,
          message,
          statusCode: isConflict ? 409 : undefined,
          reason: isStockConflict ? 'STOCK_CONFLICT' : undefined,
        };
        row.status = isConflict
          ? PosSyncCommandStatus.CONFLICT
          : PosSyncCommandStatus.FAILED;
        row.responseJson = {
          ...response,
          cashSessionId: dto.cashSessionId,
          commandType: dto.commandType,
        } as Record<string, unknown>;
        await repo.save(row);
        this.logSyncResult({
          clientOperationId,
          deviceId,
          commandType,
          status: row.status,
          durationMs: Date.now() - startedAt,
          error: message,
        });
        return response;
      }
    });
  }

  private async dispatch(
    companyId: string,
    dto: SyncCommandDtoUnion,
  ): Promise<SyncCommandResponse> {
    switch (dto.commandType) {
      case 'SALE':
        return this.saleHandler.execute(companyId, dto);
      case 'CASH_MOVEMENT':
        return this.cashMovementHandler.execute(dto);
      case 'HUB_DEPOSIT':
        return this.hubHandler.executeDeposit(dto);
      case 'HUB_WITHDRAWAL':
        return this.hubHandler.executeWithdrawal(dto);
      case 'CLOSE_SESSION':
        return this.closeSessionHandler.execute(dto);
      default:
        throw new BadRequestException(`commandType no soportado: ${(dto as SyncCommandDtoUnion).commandType}`);
    }
  }

  private async validateDto(
    commandType: PosSyncCommandType,
    body: Record<string, unknown>,
  ): Promise<SyncCommandDtoUnion> {
    const clsMap = {
      SALE: SyncSaleCommandDto,
      CASH_MOVEMENT: SyncCashMovementCommandDto,
      HUB_DEPOSIT: SyncHubDepositCommandDto,
      HUB_WITHDRAWAL: SyncHubWithdrawalCommandDto,
      CLOSE_SESSION: SyncCloseSessionCommandDto,
    } as const;
    const cls = clsMap[commandType];
    const dto = plainToInstance(
      cls as new () => SyncCommandDtoUnion,
      body,
    ) as SyncCommandDtoUnion;
    const errors = await validate(dto as object);
    if (errors.length > 0) {
      const messages = errors
        .flatMap((e) => Object.values(e.constraints ?? {}))
        .join('; ');
      throw new BadRequestException(messages || 'Payload de sync inválido');
    }
    return dto;
  }

  private logSyncResult(input: {
    clientOperationId: string;
    deviceId: string;
    commandType: string;
    status: string;
    durationMs: number;
    cached?: boolean;
    error?: string;
  }): void {
    this.logger.log(
      JSON.stringify({
        event: 'pos_offline_sync',
        ...input,
      }),
    );
  }
}
