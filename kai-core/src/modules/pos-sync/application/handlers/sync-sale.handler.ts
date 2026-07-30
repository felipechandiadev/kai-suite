import { Injectable } from '@nestjs/common';
import { FiscalBoletaEmissionService } from '@modules/fiscal/application/fiscal-boleta-emission.service';
import { SalesFromSessionService } from '@modules/cash-sessions/application/sales-from-session.service';
import { CreateSaleDto } from '@modules/cash-sessions/application/dto/create-sale.dto';
import { SyncSaleCommandDto } from '../dto/sync-sale-command.dto';
import type { SyncCommandResponse } from '../sync-command.types';

@Injectable()
export class SyncSaleHandler {
  constructor(
    private readonly salesService: SalesFromSessionService,
    private readonly fiscalBoletaEmission: FiscalBoletaEmissionService,
  ) {}

  async execute(
    companyId: string,
    dto: SyncSaleCommandDto,
  ): Promise<SyncCommandResponse> {
    const clientOperationId = dto.clientOperationId.trim();
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
      return {
        success: false,
        clientOperationId,
        message: 'No se pudo crear la venta',
      };
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

    return {
      success: true,
      clientOperationId,
      transactionId: saleResult.transaction.id,
      documentNumber: saleResult.transaction.documentNumber,
      fiscalEmission,
    };
  }
}
