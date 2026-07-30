import { Injectable, BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tax } from '@modules/taxes/domain/tax.entity';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from './dto/create-transaction.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateTransactionCommand } from './commands/create-transaction.usecase';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentStatus,
} from '../domain/transaction.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
  ) {}

  async create(dto: CreatePurchaseOrderDto) {
    const draft = Boolean(dto.saveAsDraft);
    const lineInputs = dto.lines ?? [];

    if (!draft && lineInputs.length === 0) {
      throw new BadRequestException('La orden confirmada debe incluir al menos una línea.');
    }

    const taxIds = new Set<string>();
    for (const line of lineInputs) {
      for (const id of line.taxIds) {
        taxIds.add(id);
      }
    }
    const taxes =
      taxIds.size > 0
        ? await this.taxRepo.find({ where: { id: In([...taxIds]) } })
        : [];
    const taxById = new Map(taxes.map((t) => [t.id, t]));

    const missing = [...taxIds].filter((id) => !taxById.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Impuestos no encontrados: ${missing.join(', ')}`,
      );
    }

    const linesOut: CreateTransactionLineDto[] = [];
    let subtotalNeto = 0;
    let impuestosTotal = 0;

    for (const line of lineInputs) {
      const lineNet = Math.round(line.quantity * line.unitPrice);
      let rateSumPct = 0;
      for (const tid of line.taxIds) {
        const t = taxById.get(tid);
        if (t) {
          rateSumPct += Number(t.rate) || 0;
        }
      }
      const lineTax = Math.round((lineNet * rateSumPct) / 100);
      subtotalNeto += lineNet;
      impuestosTotal += lineTax;

      const firstTaxId = line.taxIds[0];
      const lineDto = new CreateTransactionLineDto();
      lineDto.productId = line.productId;
      lineDto.productVariantId = line.variantId;
      lineDto.productName = line.productName;
      lineDto.productSku = line.sku;
      lineDto.quantity = line.quantity;
      lineDto.unitPrice = line.unitPrice;
      lineDto.discountPercentage = 0;
      lineDto.discountAmount = 0;
      lineDto.taxId = firstTaxId;
      lineDto.taxRate = rateSumPct;
      lineDto.taxAmount = lineTax;
      lineDto.subtotal = lineNet;
      lineDto.total = lineNet + lineTax;
      linesOut.push(lineDto);
    }

    const total = subtotalNeto + impuestosTotal;
    if (!draft && total < 0.01) {
      throw new BadRequestException('El total de la orden debe ser mayor a 0.');
    }

    const tx = new CreateTransactionDto();
    tx.transactionType = TransactionType.PURCHASE_ORDER;
    tx.transactionStatus = draft ? TransactionStatus.DRAFT : TransactionStatus.CONFIRMED;
    tx.branchId = dto.branchId;
    tx.userId = dto.userId;
    tx.supplierId = dto.supplierId?.trim() ? dto.supplierId.trim() : undefined;
    const sid = dto.storageId?.trim();
    if (sid) {
      tx.storageId = sid;
    }
    tx.subtotal = subtotalNeto;
    tx.taxAmount = impuestosTotal;
    tx.discountAmount = 0;
    tx.total = total;
    tx.paymentMethod = PaymentMethod.CREDIT;
    tx.paymentStatus = PaymentStatus.PENDING;
    tx.amountPaid = 0;
    tx.documentType = 'Orden de compra';
    tx.documentFolio = dto.documentFolio?.trim() || undefined;
    const notesTrim = dto.notes?.trim();
    if (notesTrim) {
      tx.notes = notesTrim;
    }
    tx.lines = linesOut;
    tx.metadata = {
      documentDate: dto.documentDate,
      purchaseOrder: true,
      ...(draft ? { saveAsDraft: true } : {}),
      lineTaxIds: lineInputs.map((l) => l.taxIds),
    };

    const validationErrors = tx.validate();
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `Validación: ${validationErrors.join('; ')}`,
      );
    }

    return this.commandBus.execute(new CreateTransactionCommand(tx));
  }
}
