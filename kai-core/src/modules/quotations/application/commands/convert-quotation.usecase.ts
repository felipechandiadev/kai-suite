import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { CreateTransactionCommand } from '@modules/transactions/application/commands/create-transaction.usecase';
import { ConvertQuotationDto } from '../dto/quotation.dtos';

export interface ConvertQuotationResult {
  quotationId: string;
  quotationDocumentNumber: string;
  targetTransactionId: string;
  targetTransactionDocumentNumber: string;
  targetType: TransactionType;
  expiredAtConversion: boolean;
  pricesRefreshed: boolean;
}

/**
 * Convierte una cotización (`Transaction.transactionType=QUOTATION`,
 * `status=CONFIRMED`) a una venta (`SALE`) o pedido de cliente
 * (`CUSTOMER_ORDER`).
 *
 *  - Se respetan los precios cotizados (snapshot copy desde
 *    `transaction_lines`), sin reconsultar `price_list_items`.
 *  - Si la vigencia (`metadata.quotation.validUntil`) ya pasó, no se convierte.
 *  - La cotización origen pasa a `status=COMPLETED` con
 *    `metadata.quotation.convertedToTransactionId`.
 *  - El destino guarda `metadata.links.quotationId` para trazabilidad
 *    bidireccional.
 */
@Injectable()
export class ConvertQuotationUseCase {
  private readonly logger = new Logger(ConvertQuotationUseCase.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepository: Repository<TransactionLine>,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    quotationId: string,
    dto: ConvertQuotationDto,
  ): Promise<ConvertQuotationResult> {
    const targetType = dto.targetType ?? TransactionType.SALE;
    if (
      targetType !== TransactionType.SALE &&
      targetType !== TransactionType.CUSTOMER_ORDER
    ) {
      throw new BadRequestException(
        'Sólo se admite convertir a SALE o CUSTOMER_ORDER',
      );
    }

    const quotation = await this.txRepository.findOne({
      where: {
        id: quotationId,
        companyId,
        transactionType: TransactionType.QUOTATION,
      },
    });
    if (!quotation) throw new NotFoundException('Cotización no encontrada');

    if (quotation.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        `La cotización ya fue convertida (folio destino: ${
          quotation.metadata?.quotation?.convertedToDocumentNumber ?? '—'
        })`,
      );
    }
    if (quotation.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException('La cotización está anulada');
    }

    const validUntilIso = quotation.metadata?.quotation?.validUntil;
    const expired =
      typeof validUntilIso === 'string' &&
      new Date(validUntilIso).getTime() < Date.now();

    if (expired) {
      throw new BadRequestException(
        'La cotización está vencida y no puede convertirse',
      );
    }

    const sourceLines = await this.lineRepository.find({
      where: { transactionId: quotation.id },
      order: { lineNumber: 'ASC' },
    });
    if (!sourceLines.length) {
      throw new BadRequestException('La cotización no tiene líneas');
    }

    const pricesRefreshed = false;

    const targetDto = new CreateTransactionDto();
    targetDto.transactionType = targetType;
    targetDto.branchId = quotation.branchId!;
    targetDto.userId = userId;
    targetDto.customerId = quotation.customerId ?? undefined;
    targetDto.pointOfSaleId =
      dto.pointOfSaleId ?? quotation.pointOfSaleId ?? undefined;
    targetDto.cashSessionId = dto.cashSessionId ?? undefined;
    targetDto.subtotal = Number(quotation.subtotal);
    targetDto.taxAmount = Number(quotation.taxAmount);
    targetDto.discountAmount = Number(quotation.discountAmount);
    targetDto.total = Number(quotation.total);
    targetDto.notes = dto.notes ?? quotation.notes ?? undefined;
    targetDto.metadata = {
      origin: targetType,
      links: {
        quotationId: quotation.id,
        quotationDocumentNumber: quotation.documentNumber,
      },
      ...(quotation.metadata?.customerSnapshot
        ? { customerSnapshot: quotation.metadata.customerSnapshot }
        : {}),
      convertedFromQuotation: {
        wasExpired: expired,
        pricesRefreshed,
      },
    };
    targetDto.lines = sourceLines.map((l) => ({
      productId: l.productId,
      productVariantId: l.productVariantId,
      unitId: l.unitId,
      taxId: l.taxId,
      productName: l.productName,
      productSku: l.productSku,
      variantName: l.variantName,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      unitCost: l.unitCost != null ? Number(l.unitCost) : undefined,
      discountPercentage: Number(l.discountPercentage),
      discountAmount: Number(l.discountAmount),
      taxRate: Number(l.taxRate),
      taxAmount: Number(l.taxAmount),
      subtotal: Number(l.subtotal),
      total: Number(l.total),
      notes: l.notes,
    })) as any;

    const created = (await this.commandBus.execute(
      new CreateTransactionCommand(targetDto),
    )) as Transaction;

    quotation.status = TransactionStatus.COMPLETED;
    quotation.metadata = {
      ...(quotation.metadata ?? {}),
      quotation: {
        ...(quotation.metadata?.quotation ?? {}),
        convertedToTransactionId: created.id,
        convertedToDocumentNumber: created.documentNumber,
        convertedAt: new Date().toISOString(),
        convertedTargetType: targetType,
        convertedExpired: expired,
      },
    };
    await this.txRepository.save(quotation);

    this.logger.log(
      `Quotation ${quotation.documentNumber} → ${created.documentNumber} (${targetType})`,
    );

    return {
      quotationId: quotation.id,
      quotationDocumentNumber: quotation.documentNumber,
      targetTransactionId: created.id,
      targetTransactionDocumentNumber: created.documentNumber,
      targetType,
      expiredAtConversion: expired,
      pricesRefreshed,
    };
  }
}
