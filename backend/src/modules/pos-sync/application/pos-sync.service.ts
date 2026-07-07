import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesFromSessionService } from '@modules/cash-sessions/application/sales-from-session.service';
import { FiscalBoletaEmissionService } from '@modules/fiscal/application/fiscal-boleta-emission.service';
import {
  PosSyncCommand,
  PosSyncCommandStatus,
} from '../domain/pos-sync-command.entity';
import { SyncSaleCommandDto } from './dto/sync-sale-command.dto';
import { TenantContext } from '@common/tenant/tenant.context';
import { CreateSaleDto } from '@modules/cash-sessions/application/dto/create-sale.dto';

export type SyncCommandResponse = {
  success: boolean;
  clientOperationId: string;
  transactionId?: string;
  documentNumber?: string;
  fiscalEmission?: unknown;
  message?: string;
  statusCode?: number;
  reason?: string;
};

@Injectable()
export class PosSyncService {
  constructor(
    @InjectRepository(PosSyncCommand)
    private readonly syncRepo: Repository<PosSyncCommand>,
    private readonly salesService: SalesFromSessionService,
    private readonly fiscalBoletaEmission: FiscalBoletaEmissionService,
  ) {}

  async syncSaleCommand(dto: SyncSaleCommandDto): Promise<SyncCommandResponse> {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }

    const clientOperationId = dto.clientOperationId.trim();
    if (!clientOperationId) {
      throw new BadRequestException('clientOperationId es requerido');
    }

    const existing = await this.syncRepo.findOne({
      where: { companyId, clientOperationId },
    });
    if (existing?.responseJson) {
      return existing.responseJson as SyncCommandResponse;
    }

    try {
      const createSaleDto: CreateSaleDto = {
        userName: dto.userName,
        pointOfSaleId: dto.pointOfSaleId,
        cashSessionId: dto.cashSessionId,
        paymentMethod: dto.paymentMethod,
        lines: dto.lines,
        payments: dto.payments,
        amountPaid: dto.amountPaid,
        changeAmount: dto.changeAmount,
        customerId: dto.customerId,
        saleDocumentKind: dto.saleDocumentKind,
        metadata: {
          ...(dto.metadata ?? {}),
          offlineSync: true,
          clientOperationId,
          deviceId: dto.deviceId,
        },
        promotionSnapshot: dto.promotionSnapshot,
      };

      const saleResult = await this.salesService.createSaleFromOfflineSync(
        createSaleDto,
      );

      if (!saleResult.success || !saleResult.transaction?.id) {
        const response: SyncCommandResponse = {
          success: false,
          clientOperationId,
          message: 'No se pudo crear la venta',
        };
        await this.persistSyncRow(companyId, dto, response, null);
        return response;
      }

      let fiscalEmission: unknown;
      if (dto.fiscal && dto.saleDocumentKind === 'BOLETA') {
        fiscalEmission = await this.fiscalBoletaEmission.adoptOfflineEmission(
          companyId,
          saleResult.transaction.id,
          dto.pointOfSaleId,
          dto.fiscal,
        );
      }

      const response: SyncCommandResponse = {
        success: true,
        clientOperationId,
        transactionId: saleResult.transaction.id,
        documentNumber: saleResult.transaction.documentNumber,
        fiscalEmission,
      };

      await this.persistSyncRow(
        companyId,
        dto,
        response,
        saleResult.transaction.id,
      );
      return response;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al sincronizar';
      const isStockConflict =
        e instanceof BadRequestException &&
        /stock insuficiente/i.test(message);
      const statusCode =
        e instanceof ConflictException || isStockConflict ? 409 : undefined;
      const response: SyncCommandResponse = {
        success: false,
        clientOperationId,
        message,
        statusCode,
        reason: isStockConflict ? 'STOCK_CONFLICT' : undefined,
      };
      await this.persistSyncRow(companyId, dto, response, null, statusCode === 409
        ? PosSyncCommandStatus.CONFLICT
        : PosSyncCommandStatus.FAILED);
      return response;
    }
  }

  private async persistSyncRow(
    companyId: string,
    dto: SyncSaleCommandDto,
    response: SyncCommandResponse,
    transactionId: string | null,
    status?: PosSyncCommandStatus,
  ): Promise<void> {
    const row =
      (await this.syncRepo.findOne({
        where: { companyId, clientOperationId: dto.clientOperationId },
      })) ??
      this.syncRepo.create({
        companyId,
        clientOperationId: dto.clientOperationId,
        deviceId: dto.deviceId,
        commandType: dto.commandType,
      });

    row.transactionId = transactionId;
    row.status = status ?? (response.success ? PosSyncCommandStatus.SYNCED : PosSyncCommandStatus.FAILED);
    row.responseJson = response as Record<string, unknown>;
    await this.syncRepo.save(row);
  }
}
